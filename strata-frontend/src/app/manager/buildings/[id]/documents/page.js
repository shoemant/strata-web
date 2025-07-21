// src/app/manager/documents/page.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderPlus,
  PlusCircle,
  UploadCloud,
  File as FileIcon,
  Trash2,
} from 'lucide-react';

export default function DocumentsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const fileInputRef = useRef(null);

  const [buildingId, setBuildingId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [newFolder, setNewFolder] = useState('');
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  const canUpload = Boolean(buildingId && session?.user?.id);

  // 1) Fetch building_id for this manager
  useEffect(() => {
    if (!session) return;
    async function loadBuilding() {
      const { data, error } = await supabase
        .from('manager_buildings')
        .select('building_id')
        .eq('user_id', session.user.id)
        .single();
      if (error) {
        console.error('Error fetching building_id:', error);
      } else {
        setBuildingId(data.building_id);
      }
    }
    loadBuilding();
  }, [session, supabase]);

  // 2) Load and dedupe folders
  useEffect(() => {
    if (!buildingId) return;
    async function loadFolders() {
      const { data, error } = await supabase
        .from('documents')
        .select('folder')
        .eq('building_id', buildingId);
      if (error) {
        console.error('Error loading folders:', error);
      } else {
        const unique = Array.from(new Set(data.map(d => d.folder || 'root')));
        setFolders(unique);
      }
    }
    loadFolders();
  }, [buildingId, supabase]);

  // 3) Load docs for the selected folder
  useEffect(() => {
    if (!buildingId) return;
    async function loadDocs() {
      const folderValue = currentFolder === 'root' ? '' : currentFolder;
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('building_id', buildingId)
        .eq('folder', folderValue)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading documents:', error);
      } else {
        setDocs(data);
      }
    }
    loadDocs();
  }, [buildingId, currentFolder, supabase]);

  // Upload handler
  async function handleUpload(e) {
    e.preventDefault();
    if (!canUpload) {
      console.error('Cannot upload; missing buildingId or user:', { buildingId, user: session?.user?.id });
      return;
    }
    if (!fileInputRef.current.files.length) return;
    setUploading(true);

    const file = fileInputRef.current.files[0];
    const folderName = currentFolder === 'root' ? '' : currentFolder;
    const path = `${buildingId}/${folderName}/${Date.now()}_${file.name}`;

    // 1) Upload to Storage
    const { error: upErr } = await supabase
      .storage
      .from('documents')
      .upload(path, file);
    if (upErr) {
      console.error('Storage upload error:', upErr);
      setUploading(false);
      return;
    }

    // 2) Get public URL
    const { data: urlData } = supabase
      .storage
      .from('documents')
      .getPublicUrl(path);

    // 3) Prepare and log payload
    const payload = {
      building_id: buildingId,
      uploaded_by: session.user.id,
      folder: folderName,
      title: file.name,
      url: urlData.publicUrl,
      path,
    };
    console.log('Inserting document row:', payload);

    // 4) Insert metadata row
    const { error: insErr } = await supabase
      .from('documents')
      .insert(payload);
    if (insErr) {
      console.error('RLS insert error:', insErr);
    } else {
      console.log('Insert succeeded');
      setDocs(d => [{ id: path, ...payload }, ...d]);
    }

    fileInputRef.current.value = '';
    setUploading(false);
  }

  // Create folder in UI
  function handleCreateFolder(e) {
    e.preventDefault();
    const name = newFolder.trim();
    if (!name) return;
    if (!folders.includes(name)) {
      setFolders(prev => [name, ...prev]);
    }
    setCurrentFolder(name);
    setNewFolder('');
  }

  // inside src/app/manager/documents/page.jsx, replace your handleDelete with:

  async function handleDelete(doc) {
    console.log('❗️ Deleting document:', doc);

    // 1) remove from Storage
    const { data: removed, error: storageErr } = await supabase
      .storage
      .from('documents')     // your bucket name
      .remove([doc.path]);

    if (storageErr) {
      console.error('❌ Storage delete error:', storageErr);
      return;
    }
    console.log('✅ Storage delete succeeded:', removed);

    // 2) remove row from postgres
    const { data: deleted, error: dbErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (dbErr) {
      console.error('❌ Database delete error:', dbErr);
      return;
    }
    console.log('✅ Database delete succeeded:', deleted);

    // 3) re‑fetch the docs for the current folder
    const folderValue = currentFolder === 'root' ? '' : currentFolder;
    const { data: fresh, error: fetchErr } = await supabase
      .from('documents')
      .select('*')
      .eq('building_id', buildingId)
      .eq('folder', folderValue)
      .order('created_at', { ascending: false });

    if (fetchErr) {
      console.error('❌ Error re‑loading documents:', fetchErr);
    } else {
      setDocs(fresh);
      console.log('📄 Docs reloaded, now:', fresh);
    }
  }

  if (!session) return <p className="p-6">Loading…</p>;

  return (

    <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-12">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 space-y-1">
              {folders.map(f => (
                <Button
                  key={f}
                  variant="ghost"
                  className={`w-full justify-start ${currentFolder === f ? 'bg-primary/10' : ''}`}
                  onClick={() => setCurrentFolder(f)}
                >
                  <FolderPlus className="mr-2" /> {f}
                </Button>
              ))}
            </ScrollArea>
            <form onSubmit={handleCreateFolder} className="mt-4 flex space-x-2">
              <Input
                placeholder="New folder"
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
              />
              <Button type="submit">
                <PlusCircle />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload to {currentFolder}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center space-x-4">
            <input type="file" ref={fileInputRef} />
            <Button
              onClick={handleUpload}
              disabled={!canUpload || uploading}
              leftIcon={<UploadCloud />}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files in {currentFolder}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 space-y-2">
              {docs.length > 0 ? docs.map(doc => (
                <div key={doc.id} className="flex justify-between items-center">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center underline hover:text-primary"
                  >
                    <FileIcon className="mr-2" /> {doc.title}
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                    <Trash2 />
                  </Button>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No files here.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      {/* Folders Column */}


      {/* Files Column */}

    </div>
  );
}
