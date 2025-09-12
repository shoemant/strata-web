'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, FolderOpen, File as FileIcon, ChevronLeft, Home, ChevronRight } from 'lucide-react';

export default function FolderExplorerCard({ buildingId, allDocsHref }) {
  const supabase = useSupabaseClient();

  // Navigation state
  const [currentPath, setCurrentPath] = useState(''); // '' === root
  const crumbs = useMemo(
    () => (currentPath ? currentPath.split('/').filter(Boolean) : []),
    [currentPath]
  );
  const prefix = useMemo(() => (currentPath ? `${currentPath}/` : ''), [currentPath]);

  // Data state
  const [topLevelFolders, setTopLevelFolders] = useState([]); // root view
  const [childFolders, setChildFolders] = useState([]);       // immediate subfolders of currentPath
  const [docs, setDocs] = useState([]);                       // files in currentPath
  const [loading, setLoading] = useState(false);

  // ---------- Helpers ----------
  const loadRootFolders = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('folder')
      .eq('building_id', buildingId);

    if (error) throw error;

    const firstLevel = new Set();
    (data || []).forEach((row) => {
      const f = row.folder || '';
      if (!f) return; // files in root
      const first = f.split('/')[0];
      if (first) firstLevel.add(first);
    });

    setTopLevelFolders(Array.from(firstLevel).sort((a, b) => a.localeCompare(b)));
  };

  const loadSubfoldersOf = async (path) => {
    const likePattern = path ? `${path}/%` : '%';

    const { data, error } = await supabase
      .from('documents')
      .select('folder')
      .eq('building_id', buildingId)
      .like('folder', likePattern);

    if (error) throw error;

    const immediate = new Set();
    (data || []).forEach((row) => {
      const f = row.folder || '';
      if (!f.startsWith(prefix)) return;
      const remainder = f.slice(prefix.length);
      if (!remainder) return;
      const firstSeg = remainder.split('/')[0];
      if (firstSeg) immediate.add(firstSeg);
    });

    setChildFolders(Array.from(immediate).sort((a, b) => a.localeCompare(b)));
  };

  const loadFilesIn = async (path) => {
    const { data, error } = await supabase
      .from('documents')
      .select('id,title,url,created_at,folder')
      .eq('building_id', buildingId)
      .eq('folder', path)
      .eq('is_folder', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setDocs(data || []);
  };

  const loadViewFor = async (path) => {
    setLoading(true);
    try {
      await Promise.all([loadSubfoldersOf(path), loadFilesIn(path)]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Effects ----------
  useEffect(() => {
    if (!buildingId) return;
    (async () => {
      setLoading(true);
      try {
        await loadRootFolders();
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!buildingId) return;
    if (currentPath === '') {
      (async () => {
        setLoading(true);
        try {
          await Promise.all([loadRootFolders(), loadFilesIn('')]);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      loadViewFor(currentPath);
    }
  }, [buildingId, currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- UI handlers ----------
  const goUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const openChild = (name) => {
    const next = currentPath ? `${currentPath}/${name}` : name;
    setCurrentPath(next);
  };

  const goHome = () => setCurrentPath('');

  // ---------- Render ----------
  const showingChildFolders = currentPath ? childFolders : topLevelFolders;
  const nothingHere = !loading && showingChildFolders.length === 0 && docs.length === 0;

  return (
    <Card className="h-full">
      
      <CardHeader>
  {/* Top row: Title + View all (matches Dashboard look) */}
  <div className="flex items-center justify-between">
    <CardTitle>Documents</CardTitle>
    {allDocsHref && (
      <Link href={allDocsHref}>
        <Button variant="ghost" size="sm">View all</Button>
      </Link>
    )}
  </div>

  {/* Second row: nav controls / breadcrumbs */}
  <div className="mt-2 flex items-center gap-2">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Up one level"
      onClick={currentPath ? goUp : undefined}
      disabled={!currentPath}
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>

    <div className="flex items-center gap-1 text-sm">
      <Button
        variant={currentPath === '' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={goHome}
      >
        <Home className="h-4 w-4 mr-1" />
        root
      </Button>

      {crumbs.map((seg, i) => (
        <React.Fragment key={`${seg}-${i}`}>
          <ChevronRight className="h-4 w-4 opacity-70" />
          <Button
            variant={i === crumbs.length - 1 ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCurrentPath(crumbs.slice(0, i + 1).join('/'))}
          >
            {seg}
          </Button>
        </React.Fragment>
      ))}
    </div>
  </div>
</CardHeader>


      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && nothingHere && (
          <p className="text-sm text-muted-foreground">No folders or files.</p>
        )}

        {!loading && !nothingHere && (
          <div className="space-y-3">
            {/* Folders grid */}
            {showingChildFolders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {showingChildFolders.map((name) => (
                  <button
                    key={name}
                    onClick={() => openChild(name)}
                    className="w-full rounded-lg border hover:bg-accent/50 px-3 py-2 flex items-center justify-between"
                    title={`Open ${name}`}
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="font-medium">{name}</span>
                    </span>
                    <FolderOpen className="h-4 w-4 opacity-70" />
                  </button>
                ))}
              </div>
            )}

            {/* Files list */}
            {docs.length > 0 && (
              <ScrollArea className="h-40 pr-2">
                <ul className="space-y-2">
                  {docs.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline hover:text-primary truncate"
                        title={doc.title}
                      >
                        <FileIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </a>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
