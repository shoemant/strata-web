'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderPlus,
  UploadCloud,
  File as FileIcon,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Home,
} from 'lucide-react';

export default function DocumentsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const fileInputRef = useRef(null);

  const { id: raw } = useParams();
  const buildingId = Array.isArray(raw) ? raw[0] : raw;

  const [currentPath, setCurrentPath] = useState(''); // '' means root
  const [newFolder, setNewFolder] = useState('');
  const [childFolders, setChildFolders] = useState([]);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // dropzone UI state
  const [dragActive, setDragActive] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });

  const isAuthed = Boolean(session?.user?.id);
  const canUpload = Boolean(buildingId && isAuthed);

  const crumbs = useMemo(
    () => (currentPath ? currentPath.split('/').filter(Boolean) : []),
    [currentPath]
  );
  const prefix = useMemo(() => (currentPath ? `${currentPath}/` : ''), [currentPath]);

  // Safer global drag guards (prevent tab navigation only when dropping on body)
  useEffect(() => {
    const preventIfFileOnBody = (e) => {
      const types = Array.from(e.dataTransfer?.types || []);
      const isFile = types.includes('Files');
      const onBody = e.target === document.body || e.currentTarget === window;
      if (isFile && onBody) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('dragover', preventIfFileOnBody);
    window.addEventListener('drop', preventIfFileOnBody);
    return () => {
      window.removeEventListener('dragover', preventIfFileOnBody);
      window.removeEventListener('drop', preventIfFileOnBody);
    };
  }, []);

  // Load immediate subfolders of currentPath
  useEffect(() => {
    if (!buildingId || !isAuthed) return;
    (async () => {
      const likePattern = currentPath ? `${currentPath}/%` : '%';
      const { data, error } = await supabase
        .from('documents')
        .select('folder')
        .eq('building_id', buildingId)
        .like('folder', likePattern);

      if (error) {
        console.error('Error loading folder list:', error);
        setChildFolders([]);
        return;
      }

      const immediate = new Set();
      for (const row of data || []) {
        const f = row.folder || ''; // ignore NULL
        if (!f || !f.startsWith(prefix)) continue;
        const remainder = f.slice(prefix.length);
        if (!remainder) continue;
        const firstSeg = remainder.split('/')[0];
        if (firstSeg) immediate.add(firstSeg);
      }
      setChildFolders(Array.from(immediate).sort((a, b) => a.localeCompare(b)));
    })();
  }, [buildingId, isAuthed, supabase, prefix, currentPath]);

  // Load files for currentPath
  async function refreshFiles() {
    let q = supabase
      .from('documents')
      .select('*')
      .eq('building_id', buildingId)
      .eq('is_folder', false)
      .order('created_at', { ascending: false });

    if (currentPath) {
      q = q.eq('folder', currentPath);
    } else {
      // root must include '' and NULL
      q = q.or('folder.eq.,folder.is.null');
    }

    const { data, error } = await q;
    if (error) {
      console.error('Error loading documents:', error);
      setDocs([]);
      return;
    }
    setDocs(data || []);
  }

  useEffect(() => {
    if (!buildingId || !isAuthed) return;
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isAuthed, supabase, currentPath]);

  // Create folder
  async function handleCreateFolder(e) {
    e.preventDefault();
    const segment = newFolder.trim().replaceAll('/', '');
    if (!segment) return;

    const newPath = currentPath ? `${currentPath}/${segment}` : segment;

    const { data: exists, error: existsErr } = await supabase
      .from('documents')
      .select('id')
      .eq('building_id', buildingId)
      .eq('folder', newPath)
      .eq('is_folder', true)
      .limit(1);

    if (existsErr) {
      console.error('Error checking folder:', existsErr.message);
      return;
    }

    if (!exists?.length) {
      const { error } = await supabase.from('documents').insert({
        building_id: buildingId,
        uploaded_by: session?.user?.id || null,
        folder: newPath,
        title: segment,
        is_folder: true,
        url: null,
        path: null,
      });
      if (error) {
        console.error('Error creating folder:', error.message);
        return;
      }
    }

    setChildFolders((prev) =>
      Array.from(new Set([...prev, segment])).sort((a, b) => a.localeCompare(b))
    );
    setNewFolder('');
  }

  // === Upload helpers (button + dropzone both use these) ===
  function makeStorageKey(fileName) {
    const safeName = fileName.replace(/\s+/g, '_');
    const base = currentPath ? `${buildingId}/${currentPath}` : `${buildingId}`;
    return `${base}/${Date.now()}_${safeName}`;
  }

  function getCurrentTimestamp() {
    const now = new Date();

    const iso = now.toISOString();

    return iso.replace('T', ' ').replace('Z', '+00');
  }

  async function uploadOne(file) {
    const storageKey = makeStorageKey(file.name);

    const { error: upErr } = await supabase.storage.from('documents').upload(storageKey, file);
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storageKey);

    const payload = {

      uploaded_by: session?.user?.id || null,
      title: file.name,
      url: urlData.publicUrl,
      created_at: getCurrentTimestamp(),
      building_id: buildingId,
      folder: currentPath,
      path: storageKey,
      is_folder: false,
    };

    const { error: insErr } = await supabase.from('documents').insert(payload);
    if (insErr) throw insErr;
  }

  async function handleUploadFiles(fileList) {
    if (!canUpload || !fileList?.length) return;
    setUploading(true);
    setUploadCount({ done: 0, total: fileList.length });

    try {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        try {
          await uploadOne(f);
        } catch (err) {
          console.error(`Failed to upload ${f.name}:`, err);
        } finally {
          setUploadCount((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }
      await refreshFiles();
    } finally {
      setUploading(false);
      setUploadCount({ done: 0, total: 0 });
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files?.length) return;
    await handleUploadFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Delete file
  async function handleDelete(doc) {
    if (!confirm(`Delete file “${doc.title}”?`)) return;

    if (doc.path) {
      const { error: storageErr } = await supabase.storage.from('documents').remove([doc.path]);
      if (storageErr) {
        console.error('Storage delete error:', storageErr);
        return;
      }
    }

    const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id);
    if (dbErr) {
      console.error('Database delete error:', dbErr);
      return;
    }

    await refreshFiles();
  }

  // Recursive delete helpers
  async function fetchRowsUnder(folderPath) {
    const { data: exact, error: e1 } = await supabase
      .from('documents')
      .select('id, path, is_folder, title, folder')
      .eq('building_id', buildingId)
      .eq('folder', folderPath);
    if (e1) throw e1;

    const { data: sub, error: e2 } = await supabase
      .from('documents')
      .select('id, path, is_folder, title, folder')
      .eq('building_id', buildingId)
      .like('folder', `${folderPath}/%`);
    if (e2) throw e2;

    return [...(exact || []), ...(sub || [])];
  }

  async function deleteFolderRecursive(targetPath) {
    setDeleting(true);
    try {
      const rows = await fetchRowsUnder(targetPath);
      const filePaths = rows.filter((r) => !r.is_folder && r.path).map((r) => r.path);
      if (filePaths.length) {
        const { error: rmErr } = await supabase.storage.from('documents').remove(filePaths);
        if (rmErr) throw rmErr;
      }
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { error: delErr } = await supabase.from('documents').delete().in('id', ids);
        if (delErr) throw delErr;
      }
    } finally {
      setDeleting(false);
    }

    if (targetPath === currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      parts.pop();
      const parent = parts.join('/');
      setCurrentPath(parent);
      setDocs([]);
    } else {
      const seg = targetPath.slice(prefix.length).split('/')[0];
      if (seg) setChildFolders((prev) => prev.filter((n) => n !== seg));
    }
  }

  async function handleDeleteChildFolder(name) {
    const target = currentPath ? `${currentPath}/${name}` : name;
    if (!confirm(`Delete folder “${target}” and EVERYTHING inside it?`)) return;
    try {
      await deleteFolderRecursive(target);
    } catch (err) {
      console.error('Folder delete failed:', err);
      alert('Failed to delete folder. Check console for details.');
    }
  }

  async function handleDeleteCurrentFolder() {
    if (!currentPath) return;
    if (!confirm(`Delete folder “${currentPath}” and EVERYTHING inside it?`)) return;
    try {
      await deleteFolderRecursive(currentPath);
    } catch (err) {
      console.error('Folder delete failed:', err);
      alert('Failed to delete folder. Check console for details.');
    }
  }

  function goToCrumb(idx) {
    if (idx < 0) {
      setCurrentPath('');
      return;
    }
    const next = crumbs.slice(0, idx + 1).join('/');
    setCurrentPath(next);
  }

  function openChild(name) {
    setCurrentPath(currentPath ? `${currentPath}/${name}` : name);
  }

  // Dropzone handlers (scoped to list panel)
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX <= rect.left ||
      clientX >= rect.right ||
      clientY <= rect.top ||
      clientY >= rect.bottom
    ) {
      setDragActive(false);
    }
  };
  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canUpload) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    await handleUploadFiles(files);
  };

  if (!session || !buildingId) return <p className="p-6">Loading…</p>;

  return (
    <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Go up"
                onClick={() => {
                  if (!currentPath) return;
                  const parts = currentPath.split('/').filter(Boolean);
                  parts.pop();
                  setCurrentPath(parts.join('/'));
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant={currentPath === '' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPath('')}
              >
                <Home className="h-4 w-4 mr-1" /> root
              </Button>

              {crumbs.map((seg, i) => (
                <React.Fragment key={`${seg}-${i}`}>
                  <ChevronRight className="h-4 w-4" />
                  <Button
                    variant={i === crumbs.length - 1 ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => goToCrumb(i)}
                  >
                    {seg}
                  </Button>
                </React.Fragment>
              ))}

              {currentPath && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-2"
                  onClick={handleDeleteCurrentFolder}
                  disabled={deleting}
                  title="Delete this folder and everything inside it"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting…' : 'Delete this folder'}
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form onSubmit={handleCreateFolder} className="flex gap-2">
                <Input
                  placeholder={`New folder in ${currentPath || 'root'}`}
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  className="w-56"
                />
                <Button type="submit" title="Create subfolder">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </form>

              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} multiple />
                <Button
                  onClick={handleUpload}
                  disabled={!canUpload || uploading}
                  className="inline-flex items-center"
                  title={`Upload to ${currentPath || 'root'}`}
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {uploading
                    ? `Uploading ${uploadCount.done}/${uploadCount.total}…`
                    : 'Upload'}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground">Browsing {currentPath || 'root'}</p>
          </div>
        </CardHeader>

        <CardContent>
          {/* Drop target around the list ONLY (invisible until dragging) */}
          <div
            className="rounded-md border relative"
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Header row */}
            <div className="grid grid-cols-[24px_1fr_auto] items-center px-3 py-2 text-xs uppercase text-muted-foreground border-b">
              <div />
              <div>Name</div>
              <div>Actions</div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="h-[540px]">
              <div className="divide-y">
                {childFolders?.length > 0 &&
                  childFolders.map((name) => (
                    <div
                      key={`folder-${name}`}
                      className="grid grid-cols-[24px_1fr_auto] items-center px-3 py-2 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-center">
                        <FolderPlus className="h-4 w-4" />
                      </div>
                      <button
                        className="text-left hover:text-primary"
                        onClick={() => openChild(name)}
                        title={`Open ${name}`}
                      >
                        {name}
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`Delete folder ${name}`}
                          onClick={() => handleDeleteChildFolder(name)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                {docs?.length > 0 &&
                  docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="grid grid-cols-[24px_1fr_auto] items-center px-3 py-2 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-center">
                        <FileIcon className="h-4 w-4" />
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary truncate"
                        title={doc.title}
                      >
                        {doc.title}
                      </a>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`Delete file ${doc.title}`}
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                {!childFolders?.length && !docs?.length && (
                  <div className="px-3 py-10 text-sm text-muted-foreground text-center">
                    This folder is empty. Create a subfolder or upload files.
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Invisible overlay that shows ONLY during drag */}
            <div
              className={[
                'absolute inset-0 rounded-md transition',
                dragActive
                  ? 'pointer-events-auto border-2 border-dashed border-primary bg-primary/5'
                  : 'pointer-events-none',
              ].join(' ')}
              aria-hidden={!dragActive}
            >
              {dragActive && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-sm text-muted-foreground">
                    Release to upload to “{currentPath || 'root'}”
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
