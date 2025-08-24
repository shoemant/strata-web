'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, FolderOpen, File as FileIcon, ChevronLeft } from 'lucide-react';

export default function FolderExplorerCard({ buildingId, allDocsHref }) {
  const supabase = useSupabaseClient();
  const [view, setView] = useState('folders'); // 'folders' | 'files'
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!buildingId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('folder')
        .eq('building_id', buildingId);

      if (!error) {
        const raw = (data || []).map(d => (d.folder?.length ? d.folder : 'root'));
        const unique = Array.from(new Set(raw)).sort((a, b) => {
          if (a === 'root') return -1;
          if (b === 'root') return 1;
          return a.localeCompare(b);
        });
        setFolders(unique);
      }
      setLoading(false);
    })();
  }, [buildingId, supabase]);

  const enterFolder = async (folderName) => {
    if (!buildingId) return;
    setLoading(true);
    const folderValue = folderName === 'root' ? '' : folderName;
    const { data, error } = await supabase
      .from('documents')
      .select('id,title,url,path,created_at,folder')
      .eq('building_id', buildingId)
      .eq('folder', folderValue)
      .order('created_at', { ascending: false });

    if (!error) {
      setDocs(data || []);
      setCurrentFolder(folderName);
      setView('files');
    }
    setLoading(false);
  };

  const goBack = () => {
    setView('folders');
    setCurrentFolder(null);
  };

  const FolderButton = ({ name }) => (
    <button
      onClick={() => enterFolder(name)}
      className="w-full rounded-lg border hover:bg-accent/50 px-3 py-2 flex items-center justify-between"
    >
      <span className="flex items-center gap-2">
        <Folder className="h-4 w-4" />
        <span className="font-medium">{name}</span>
      </span>
      <FolderOpen className="h-4 w-4 opacity-70" />
    </button>
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view === 'files' && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-full p-1 hover:bg-accent"
              aria-label="Back to folders"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <CardTitle>
            {view === 'folders' ? 'Documents' : `Folder: ${currentFolder}`}
          </CardTitle>
        </div>
        {allDocsHref && (
          <Link href={allDocsHref}>
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && view === 'folders' && (
          folders.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {folders.map((f) => <FolderButton key={f} name={f} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No folders yet.</p>
          )
        )}

        {!loading && view === 'files' && (
          docs.length ? (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 underline hover:text-primary truncate"
                  >
                    <FileIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </a>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No files in this folder.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
