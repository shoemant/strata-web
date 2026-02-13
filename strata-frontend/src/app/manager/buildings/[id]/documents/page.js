'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import DeleteConfirmDialog from './_components/DeleteConfirmDialog';

import {
  FolderPlus,
  UploadCloud,
  File as FileIcon,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Home,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import { RenameDialog } from '@/components/documents/RenameDialog';
import { VisibilityDialog } from '@/components/documents/VisibilityDialog';

export default function DocumentsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const fileInputRef = useRef(null);
  const [visibilityDialog, setVisibilityDialog] = useState({
    open: false,
    folder: null,
  });
  const { id: raw } = useParams();
  const buildingId = Array.isArray(raw) ? raw[0] : raw;

  console.log('📌 buildingId from useParams:', buildingId);

  const [currentPath, setCurrentPath] = useState(''); // '' means root
  const [newFolder, setNewFolder] = useState('');
  const [childFolders, setChildFolders] = useState([]);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [renameDialog, setRenameDialog] = useState({ open: false, doc: null });

  // dropzone UI state
  const [dragActive, setDragActive] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });

  const isAuthed = Boolean(session?.user?.id);
  const canUpload = Boolean(buildingId && isAuthed);

  const crumbs = useMemo(
    () => (currentPath ? currentPath.split('/').filter(Boolean) : []),
    [currentPath]
  );
  const prefix = useMemo(
    () => (currentPath ? `${currentPath}/` : ''),
    [currentPath]
  );

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    target: null,
    isFolder: false,
  });

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
    refreshFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleRenameFile(doc) {
    const newTitle = prompt('Enter new file name:', doc.title);
    if (!newTitle || newTitle === doc.title) return;

    // Just change the title, keep url/path the same
    const { error } = await supabase
      .from('documents')
      .update({ title: newTitle })
      .eq('id', doc.id);

    if (error) {
      console.error('DB rename error:', error);
      alert('Failed to rename file in DB.');
    } else {
      await refreshFiles();
    }
  }

  async function refreshFolders() {
    const pref = currentPath ? `${currentPath}/` : '';
    const likePattern = `${pref}%`;

    const { data, error } = await supabase
      .from('documents')
      .select('id, folder, title, is_folder')
      .eq('building_id', buildingId)
      .eq('is_folder', true)
      .like('folder', likePattern);

    if (error) {
      console.error('Error loading folder list:', error);
      setChildFolders([]);
      return;
    }

    const rows = data || [];

    // Heuristic: if we see ANY folder with folder === currentPath, assume Mode A (parent-path model)
    const looksLikeParentModel = rows.some(
      (r) => (r.folder || '') === (currentPath || '')
    );

    let items = [];

    if (looksLikeParentModel) {
      // MODE A: parent-path model -> immediate children are rows with folder === currentPath
      const immediate = rows.filter(
        (r) => (r.folder || '') === (currentPath || '')
      );
      items = immediate
        .map((r) => ({ id: r.id, segment: r.title, title: r.title }))
        .sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // MODE B: self-path model -> immediate children are rows with folder starting with `${pref}`
      // where the remainder has no '/'
      const immediateSegs = new Set();
      rows.forEach((row) => {
        const f = row.folder || '';
        if (!f.startsWith(pref)) return;
        const remainder = f.slice(pref.length);
        if (!remainder || remainder.includes('/')) return; // only immediate
        immediateSegs.add(remainder);
      });

      const titleBySeg = new Map();
      immediateSegs.forEach((seg) => {
        const exact = rows.find((r) => r.folder === `${pref}${seg}`);
        titleBySeg.set(seg, (exact && exact.title) || seg);
      });

      items = Array.from(titleBySeg.entries())
        .map(([segment, title]) => {
          const exact = rows.find((r) => r.folder === `${pref}${segment}`);
          return {
            id: exact ? exact.id : null, // ✅ ensure ID is always present
            segment,
            title,
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    setChildFolders(items);
  }

  // Change signature to accept (oldName, newName)
  async function handleRenameFolder(oldName, newName) {
    if (!newName || newName === oldName) return;

    const isRoot = !currentPath;
    const oldPath = isRoot ? oldName : `${currentPath}/${oldName}`;
    const newPath = isRoot ? newName : `${currentPath}/${newName}`;

    // lookup row
    const { data: foundB } = await supabase
      .from('documents')
      .select('id, folder, title')
      .eq('building_id', buildingId)
      .eq('is_folder', true)
      .eq('folder', oldPath)
      .limit(1);

    let folderRow = (foundB && foundB[0]) || null;

    if (!folderRow) {
      const { data: foundA } = await supabase
        .from('documents')
        .select('id, folder, title')
        .eq('building_id', buildingId)
        .eq('is_folder', true)
        .eq('folder', currentPath || '')
        .eq('title', oldName)
        .limit(1);

      folderRow = (foundA && foundA[0]) || null;
    }

    if (!folderRow) {
      alert('Could not find folder row to rename.');
      return;
    }

    const isModeA = (folderRow.folder || '') === (currentPath || '');
    const folderUpdate = isModeA
      ? { title: newName }
      : { title: newName, folder: newPath };

    await supabase
      .from('documents')
      .update(folderUpdate)
      .eq('id', folderRow.id);

    // update descendants
    const { data: descendants } = await supabase
      .from('documents')
      .select('id, folder')
      .eq('building_id', buildingId)
      .like('folder', `${oldPath}/%`);

    for (const row of descendants || []) {
      const updatedFolder = row.folder.replace(oldPath, newPath);
      await supabase
        .from('documents')
        .update({ folder: updatedFolder })
        .eq('id', row.id);
    }

    await Promise.all([refreshFolders(), refreshFiles()]);
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
      const { data: inserted, error } = await supabase
        .from('documents')
        .insert({
          building_id: buildingId,
          uploaded_by: session?.user?.id || null,
          folder: newPath, // <-- this is Mode B (self-path)
          title: segment, // display name
          is_folder: true,
          url: null,
          path: null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating folder:', error.message);
        return;
      }

      // ✅ use the ID we just inserted
      setChildFolders((prev) => {
        const next = [...prev];
        if (!next.some((f) => f.segment === segment)) {
          next.push({ id: inserted.id, segment, title: segment });
        }
        return next.sort((a, b) => a.title.localeCompare(b.title));
      });
      setNewFolder('');
    }

    setChildFolders((prev) => {
      const segment = newPath.split('/').pop();
      const title = segment; // display name equals segment by default
      const next = [...prev];

      // avoid duplicates by segment
      if (!next.some((f) => f.segment === segment)) {
        next.push({ segment, title });
      }
      return next.sort((a, b) => a.title.localeCompare(b.title));
    });
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

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(storageKey, file);
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storageKey);

    const payload = {
      uploaded_by: session?.user?.id || null,
      title: file.name,
      url: urlData.publicUrl,
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
  async function handleDelete(doc, skipDialog = false) {
    // If dialog should be shown, open it
    if (!skipDialog) {
      setDeleteDialog({ open: true, target: doc, isFolder: false });
      return;
    }

    if (doc.path) {
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .remove([doc.path]);
      if (storageErr) {
        console.error('Storage delete error:', storageErr);
        return;
      }
    }

    const { error: dbErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);
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
      const filePaths = rows
        .filter((r) => !r.is_folder && r.path)
        .map((r) => r.path);
      if (filePaths.length) {
        const { error: rmErr } = await supabase.storage
          .from('documents')
          .remove(filePaths);
        if (rmErr) throw rmErr;
      }
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { error: delErr } = await supabase
          .from('documents')
          .delete()
          .in('id', ids);
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
      if (seg)
        setChildFolders((prev) =>
          prev.filter((f) =>
            typeof f === 'string' ? f !== seg : f.segment !== seg
          )
        );
    }
  }

  async function handleDeleteChildFolder(name) {
    const target = currentPath ? `${currentPath}/${name}` : name;
    setDeleteDialog({ open: true, target, isFolder: true });
  }

  async function handleDeleteCurrentFolder() {
    if (!currentPath) return;
    if (!confirm(`Delete folder “${currentPath}” and EVERYTHING inside it?`))
      return;
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
    <div className="absolute inset-y-0 left-0 md:left-16 right-0 overflow-auto bg-background p-6 space-y-6">
      <Card className="mt-14">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Breadcrumbs */}
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
                <Home className="h-4 w-4 mr-1" /> Home
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
            </div>

            {/* Folder creation + upload */}
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
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  className={[
                    'inline-flex items-center px-3 py-2 rounded-md cursor-pointer text-sm whitespace-nowrap transition',
                    uploading
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',

                    // ✨ Highlight during drag
                    dragActive &&
                      'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  ].join(' ')}
                >
                  {' '}
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {uploading
                    ? `Uploading ${uploadCount.done}/${uploadCount.total}…`
                    : 'Upload Files'}
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                  />
                </label>
              </div>
            </div>
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
                {/* Child folders */}
                {childFolders?.length > 0 &&
                  childFolders.map((f) => {
                    const segment = typeof f === 'string' ? f : f.segment;
                    const title = typeof f === 'string' ? f : f.title;
                    return (
                      <div
                        key={`folder-${segment}`}
                        className="grid grid-cols-[24px_1fr_auto] items-center px-3 py-2 hover:bg-muted/40"
                      >
                        <div className="flex items-center justify-center">
                          <FolderPlus className="h-4 w-4" />
                        </div>
                        <button
                          className="text-left hover:text-primary"
                          onClick={() => openChild(segment)}
                          title={`Open ${title}`}
                        >
                          {title}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4 rotate-90" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                setRenameDialog({
                                  open: true,
                                  doc: { id: segment, title }, // mock structure for folders
                                })
                              }
                            >
                              <Image
                                src="/images/icons/rename.png"
                                alt="Rename"
                                width={16}
                                height={16}
                                className="mr-2"
                              />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (!f.id) {
                                  alert(
                                    'This folder has no database ID. Please refresh or re-create it.'
                                  );
                                  return;
                                }
                                setVisibilityDialog({ open: true, folder: f });
                              }}
                            >
                              <Image
                                src="/images/icons/visibility.png"
                                alt="Visibility"
                                width={16}
                                height={16}
                                className="mr-2"
                              />
                              Visibility
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleDeleteChildFolder(segment)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}

                {/* Files */}
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

                      {/* 3-dot dropdown for files */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => setRenameDialog({ open: true, doc })}
                          >
                            <Image
                              src="/images/icons/rename.png"
                              alt="Rename"
                              width={16}
                              height={16}
                              className="mr-2"
                            />
                            Rename
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDelete(doc)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                {/* Empty state */}
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
                  <div className="text-sm text-primary font-medium animate-pulse">
                    Drop to upload to “{currentPath || 'Home'}”
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RenameDialog
        open={renameDialog.open}
        defaultValue={renameDialog.doc?.title}
        onClose={() => setRenameDialog({ open: false, doc: null })}
        onConfirm={async (newTitle) => {
          if (!newTitle || newTitle === renameDialog.doc?.title) return;

          const isFile = renameDialog.doc?.id?.length === 36;
          if (isFile) {
            await supabase
              .from('documents')
              .update({ title: newTitle })
              .eq('id', renameDialog.doc.id);
            await refreshFiles();
          } else {
            // pass old + new name
            await handleRenameFolder(renameDialog.doc.title, newTitle);
          }
        }}
      />

      <VisibilityDialog
        open={visibilityDialog.open}
        folder={visibilityDialog.folder}
        onClose={() => setVisibilityDialog({ open: false, folder: null })}
        supabase={supabase}
        buildingId={buildingId}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        title={deleteDialog.isFolder ? 'Delete Folder?' : 'Delete File?'}
        description={
          deleteDialog.isFolder
            ? 'This will permanently remove this folder and everything inside.'
            : 'This file will be permanently deleted.'
        }
        onClose={() =>
          setDeleteDialog({ open: false, target: null, isFolder: false })
        }
        onConfirm={async () => {
          if (deleteDialog.isFolder) {
            await deleteFolderRecursive(deleteDialog.target);
          } else {
            await handleDelete(deleteDialog.target, true); // modify handleDelete to skip dialog loop
          }
          setDeleteDialog({ open: false, target: null, isFolder: false });
        }}
      />
    </div>
  );
}
