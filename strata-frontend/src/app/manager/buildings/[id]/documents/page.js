'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
  Folder as FolderIcon,
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

  const { id: raw } = useParams();
  const buildingId = Array.isArray(raw) ? raw[0] : raw;

  const isAuthed = Boolean(session?.user?.id);
  const canUpload = Boolean(buildingId && isAuthed);

  // ✅ NEW: navigation by folder id, not string path
  // crumbs = [{id,title}, ...] -> currentFolderId = last id or null (root)
  const [crumbs, setCrumbs] = useState([]); // [{id, title}]
  const currentFolderId = crumbs.length ? crumbs[crumbs.length - 1].id : null;

  const [newFolder, setNewFolder] = useState('');
  const [childFolders, setChildFolders] = useState([]); // [{id,title,is_folder:true}]
  const [docs, setDocs] = useState([]); // files

  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });

  const [dragActive, setDragActive] = useState(false);

  const [renameDialog, setRenameDialog] = useState({ open: false, doc: null });

  const [visibilityDialog, setVisibilityDialog] = useState({
    open: false,
    item: null, // folder OR file row
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    target: null, // file row OR folder row
    isFolder: false,
  });

  // Prevent dropping file on body from navigating away
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

  // ---------- Queries ----------
  async function refreshFolders() {
    if (!buildingId || !isAuthed) return;

    let q = supabase
      .from('documents')
      .select('id, title, is_folder, parent_id')
      .eq('building_id', buildingId)
      .eq('is_folder', true)
      .order('title', { ascending: true });

    if (currentFolderId) q = q.eq('parent_id', currentFolderId);
    else q = q.is('parent_id', null);

    const { data, error } = await q;
    if (error) {
      console.error('Error loading folders:', error);
      setChildFolders([]);
      return;
    }
    setChildFolders(data || []);
  }

  async function refreshFiles() {
    if (!buildingId || !isAuthed) return;

    let q = supabase
      .from('documents')
      .select('*')
      .eq('building_id', buildingId)
      .eq('is_folder', false)
      .order('created_at', { ascending: false });

    if (currentFolderId) q = q.eq('parent_id', currentFolderId);
    else q = q.is('parent_id', null);

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
    refreshFolders();
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isAuthed, currentFolderId]);

  // ---------- Navigation ----------
  function goHome() {
    setCrumbs([]);
  }

  function goUp() {
    setCrumbs((prev) => prev.slice(0, -1));
  }

  function goToCrumb(idx) {
    if (idx < 0) return goHome();
    setCrumbs((prev) => prev.slice(0, idx + 1));
  }

  function openChildFolder(folderRow) {
    setCrumbs((prev) => [
      ...prev,
      { id: folderRow.id, title: folderRow.title },
    ]);
  }

  // ---------- Create folder ----------
  async function handleCreateFolder(e) {
    e.preventDefault();
    if (!canUpload) return;

    const name = newFolder.trim().replaceAll('/', '');
    if (!name) return;

    // optional: prevent duplicates within same parent (you also have unique indexes)
    const { data: exists, error: existsErr } = await supabase
      .from('documents')
      .select('id')
      .eq('building_id', buildingId)
      .eq('is_folder', true)
      .eq('title', name)
      .match(currentFolderId ? { parent_id: currentFolderId } : {})
      .limit(1);

    if (existsErr) console.error('Folder exists check error:', existsErr);

    if (exists?.length) {
      setNewFolder('');
      return;
    }

    const payload = {
      building_id: buildingId,
      uploaded_by: session?.user?.id || null,
      title: name,
      is_folder: true,
      parent_id: currentFolderId, // null = root
      url: null,
      path: null,

      // keep folder column harmlessly for now (optional)
      folder: '',
    };

    const { error } = await supabase.from('documents').insert(payload);
    if (error) {
      console.error('Error creating folder:', error);
      return;
    }

    setNewFolder('');
    await refreshFolders();
  }

  // ---------- Upload ----------
  function makeStorageKey(fileName) {
    const safeName = fileName.replace(/\s+/g, '_');
    // ✅ Make storage path IMMUTABLE (moves/renames won't touch bucket)
    return `${buildingId}/${Date.now()}_${safeName}`;
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
      is_folder: false,
      path: storageKey,
      parent_id: currentFolderId, // ✅ attaches file to current folder
      folder: '', // legacy column, ignore
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

  // ---------- Rename ----------
  async function handleRenameFolder(folderId, newName) {
    const name = (newName || '').trim();
    if (!name) return;

    const { error } = await supabase
      .from('documents')
      .update({ title: name }) // ✅ only title changes in tree model
      .eq('id', folderId);

    if (error) {
      console.error('Folder rename error:', error);
      alert('Failed to rename folder.');
      return;
    }

    // Update breadcrumb title if you renamed an ancestor currently in crumbs
    setCrumbs((prev) =>
      prev.map((c) => (c.id === folderId ? { ...c, title: name } : c))
    );

    await refreshFolders();
  }

  async function handleRenameFile(fileId, newName) {
    const name = (newName || '').trim();
    if (!name) return;

    const { error } = await supabase
      .from('documents')
      .update({ title: name })
      .eq('id', fileId);

    if (error) {
      console.error('File rename error:', error);
      alert('Failed to rename file.');
      return;
    }

    await refreshFiles();
  }

  // ---------- Delete (file) ----------
  async function deleteFile(doc) {
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

  // ---------- Delete (folder recursive by parent_id) ----------
  async function fetchDescendantsRecursive(rootFolderId) {
    // Small-docs friendly BFS in JS (no RPC required)
    const allRows = [];
    const queue = [rootFolderId];

    while (queue.length) {
      const parent = queue.shift();

      const { data, error } = await supabase
        .from('documents')
        .select('id, is_folder, path, title, parent_id')
        .eq('building_id', buildingId)
        .eq('parent_id', parent);

      if (error) throw error;

      for (const row of data || []) {
        allRows.push(row);
        if (row.is_folder) queue.push(row.id);
      }
    }

    return allRows;
  }

  async function deleteFolderRecursive(folderRow) {
    const folderId = folderRow.id;

    // 1) gather all descendants (children, grandchildren, etc.)
    const descendants = await fetchDescendantsRecursive(folderId);

    // include the folder itself
    const all = [...descendants, folderRow];

    // 2) remove files from bucket
    const filePaths = all
      .filter((r) => !r.is_folder && r.path)
      .map((r) => r.path);
    if (filePaths.length) {
      const { error: rmErr } = await supabase.storage
        .from('documents')
        .remove(filePaths);
      if (rmErr) throw rmErr;
    }

    // 3) delete db rows (descendants first, then folder)
    const ids = all.map((r) => r.id);
    if (ids.length) {
      const { error: delErr } = await supabase
        .from('documents')
        .delete()
        .in('id', ids);
      if (delErr) throw delErr;
    }

    // 4) if you deleted the folder you're currently inside, go up
    if (currentFolderId === folderId) goUp();

    await Promise.all([refreshFolders(), refreshFiles()]);
  }

  // ---------- Dropzone ----------
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
                onClick={goUp}
                disabled={!crumbs.length}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant={crumbs.length === 0 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={goHome}
              >
                <Home className="h-4 w-4 mr-1" /> Home
              </Button>

              {crumbs.map((c, i) => (
                <React.Fragment key={c.id}>
                  <ChevronRight className="h-4 w-4" />
                  <Button
                    variant={i === crumbs.length - 1 ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => goToCrumb(i)}
                  >
                    {c.title}
                  </Button>
                </React.Fragment>
              ))}
            </div>

            {/* Folder creation + upload */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form onSubmit={handleCreateFolder} className="flex gap-2">
                <Input
                  placeholder={`New folder in ${crumbs.length ? crumbs[crumbs.length - 1].title : 'root'}`}
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
                    dragActive &&
                      'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  ].join(' ')}
                >
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

            <ScrollArea className="h-[540px]">
              <div className="divide-y">
                {/* Folders */}
                {childFolders?.length > 0 &&
                  childFolders.map((f) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-[24px_1fr_auto] items-center px-3 py-2 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-center">
                        <FolderIcon className="h-4 w-4" />
                      </div>

                      <button
                        className="text-left hover:text-primary"
                        onClick={() => openChildFolder(f)}
                        title={`Open ${f.title}`}
                      >
                        {f.title}
                      </button>

                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onSelect={() =>
                              setRenameDialog({
                                open: true,
                                doc: { ...f, is_folder: true },
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
                            onSelect={() =>
                              setVisibilityDialog({ open: true, item: f })
                            }
                          >
                            <Image
                              src="/images/icons/visibility.png"
                              alt="Rename"
                              width={16}
                              height={16}
                              className="mr-2"
                            />
                            Visibility
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() =>
                              setDeleteDialog({
                                open: true,
                                target: f,
                                isFolder: true,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

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

                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onSelect={() =>
                              setRenameDialog({ open: true, doc })
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
                            onSelect={() =>
                              setVisibilityDialog({ open: true, item: doc })
                            }
                          >
                            <Image
                              src="/images/icons/visibility.png"
                              alt="Rename"
                              width={16}
                              height={16}
                              className="mr-2"
                            />
                            Visibility
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() =>
                              setDeleteDialog({
                                open: true,
                                target: doc,
                                isFolder: false,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                {!childFolders?.length && !docs?.length && (
                  <div className="px-3 py-10 text-sm text-muted-foreground text-center">
                    This folder is empty. Create a subfolder or upload files.
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* drag overlay */}
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
                    Drop to upload to “
                    {crumbs.length ? crumbs[crumbs.length - 1].title : 'Home'}”
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
          const d = renameDialog.doc;
          if (!d) return;

          if (d.is_folder) {
            await handleRenameFolder(d.id, newTitle);
          } else {
            await handleRenameFile(d.id, newTitle);
          }
        }}
      />

      <VisibilityDialog
        open={visibilityDialog.open}
        folder={visibilityDialog.item} // keep prop name "folder" to avoid touching the dialog file
        onClose={() => setVisibilityDialog({ open: false, item: null })}
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
          try {
            if (deleteDialog.isFolder) {
              await deleteFolderRecursive(deleteDialog.target);
            } else {
              await deleteFile(deleteDialog.target);
            }
          } catch (err) {
            console.error('Delete failed:', err);
            alert('Delete failed. Check console for details.');
          } finally {
            setDeleteDialog({ open: false, target: null, isFolder: false });
          }
        }}
      />
    </div>
  );
}
