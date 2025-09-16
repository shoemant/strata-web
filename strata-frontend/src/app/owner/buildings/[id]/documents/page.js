'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

import {
  Home,
  Folder as FolderIcon,
  ChevronRight,
  File as FileIcon,
  ArrowUpRight,
  Search,
} from 'lucide-react';

/** Small util: safe param name */
function useBuildingIdFromParams() {
  const params = useParams();
  // Make sure this matches your folder name: [id]
  const raw = params?.id ?? params?.id ?? params?.bid ?? params?.slug;
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Decompose 'a/b/c' → ['a','b','c'] */
const splitPath = (p) => (p ? p.split('/').filter(Boolean) : []);

/** Build a simple nested tree { name, path, children:Set } from list of folder strings */
function buildFolderTree(folders) {
  const root = { name: 'root', path: '', children: new Map() };

  for (const f of folders) {
    const parts = splitPath(f);
    let node = root;
    let accum = '';
    for (const seg of parts) {
      accum = accum ? `${accum}/${seg}` : seg;
      if (!node.children.has(seg)) {
        node.children.set(seg, { name: seg, path: accum, children: new Map() });
      }
      node = node.children.get(seg);
    }
  }
  return root;
}

/** Extract immediate child folder names for a given currentPath */
function getImmediateChildren(root, currentPath) {
  const parts = splitPath(currentPath);
  let node = root;
  for (const seg of parts) {
    const next = node.children.get(seg);
    if (!next) return [];
    node = next;
  }
  return Array.from(node.children.values()).map((n) => n.name);
}

/** Simple file extension badge */
function FileTypeBadge({ title }) {
  const ext = (title?.split('.').pop() || '').toLowerCase();
  if (!ext) return null;
  return <Badge variant="secondary" className="uppercase">{ext}</Badge>;
}

export default function OwnerDocumentsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const buildingId = useBuildingIdFromParams();

  const [loading, setLoading] = useState(true);
  const [allFolders, setAllFolders] = useState([]);          // array of folder strings ('' for root)
  const [currentPath, setCurrentPath] = useState('');        // '' means root
  const [docs, setDocs] = useState([]);                      // files in currentPath
  const [search, setSearch] = useState('');

  const crumbs = useMemo(() => splitPath(currentPath), [currentPath]);
  const folderTree = useMemo(() => buildFolderTree(allFolders), [allFolders]);
  const childFolders = useMemo(
    () => getImmediateChildren(folderTree, currentPath).sort((a, b) => a.localeCompare(b)),
    [folderTree, currentPath]
  );

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.toLowerCase();
    return docs.filter((d) => (d.title || '').toLowerCase().includes(q));
  }, [docs, search]);

  // Load folders + current folder documents
  useEffect(() => {
    if (!session?.user?.id || !buildingId) return;

    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        // 1) Get all folder strings where there are docs or folders (is_folder true OR from files)
        //    We query both is_folder rows and file rows to ensure the tree reflects actual structure.
        const [{ data: folderRows }, { data: fileRows }] = await Promise.all([
          supabase
            .from('documents')
            .select('folder, is_folder')
            .eq('building_id', buildingId),
          supabase
            .from('documents')
            .select('id, title, url, created_at, folder, is_folder')
            .eq('building_id', buildingId)
            .eq('is_folder', false)
            .or('folder.eq.,folder.is.null') // we’ll filter by currentPath below for initial view
            .order('created_at', { ascending: false }),
        ]);

        if (canceled) return;

        // Collect all distinct folders from both folder records and file records
        const folderSet = new Set();
        (folderRows || []).forEach((r) => {
          if (r.folder) folderSet.add(r.folder);
        });
        (fileRows || []).forEach((r) => {
          // include parent folder of each file
          if (r.folder) folderSet.add(r.folder);
        });

        // Ensure root (empty string) exists for tree display
        folderSet.add('');

        setAllFolders(Array.from(folderSet));

        // Initial docs for root
        const docsInRoot = (fileRows || []).filter((r) => !r.folder || r.folder === '');
        setDocs(docsInRoot);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [session?.user?.id, buildingId, supabase]);

  // When currentPath changes, load that folder’s docs
  useEffect(() => {
    if (!session?.user?.id || !buildingId) return;
    (async () => {
      setLoading(true);
      try {
        let q = supabase
          .from('documents')
          .select('id, title, url, created_at, folder, is_folder')
          .eq('building_id', buildingId)
          .eq('is_folder', false)
          .order('created_at', { ascending: false });

        if (currentPath) {
          q = q.eq('folder', currentPath);
        } else {
          // root: include '' and NULL
          q = q.or('folder.eq.,folder.is.null');
        }

        const { data, error } = await q;
        if (error) {
          console.error('Error loading documents:', error);
          setDocs([]);
          return;
        }
        setDocs(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPath, session?.user?.id, buildingId, supabase]);

  if (!session || !buildingId) return <p className="p-6">Loading…</p>;

  return (
    <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse building files. You can open or download any document you have access to.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files by name…"
                className="pl-8"
                aria-label="Search documents"
              />
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="mt-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Button
                    variant={currentPath === '' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPath('')}
                    className="gap-1"
                  >
                    <Home className="h-4 w-4" />
                    root
                  </Button>
                </BreadcrumbItem>
                {crumbs.map((seg, i) => (
                  <React.Fragment key={`${seg}-${i}`}>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <Button
                        variant={i === crumbs.length - 1 ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          const next = crumbs.slice(0, i + 1).join('/');
                          setCurrentPath(next);
                        }}
                      >
                        {seg}
                      </Button>
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* FOLDER TREE SIDEBAR */}
            <Card className="border-dashed">
              <CardHeader className="py-3">
                <CardTitle className="text-base">Folders</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                <ScrollArea className="h-[520px]">
                  {loading ? (
                    <div className="p-3 space-y-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-48" />
                      ))}
                    </div>
                  ) : (
                    <nav className="p-2">
                      {/* Root */}
                      <FolderRow
                        name="root"
                        active={currentPath === ''}
                        onClick={() => setCurrentPath('')}
                        level={0}
                      />
                      {/* Immediate children of current node */}
                      <div className="mt-1">
                        {childFolders.length > 0 ? (
                          childFolders.map((name) => (
                            <FolderRow
                              key={name}
                              name={name}
                              active={currentPath.endsWith(name) && splitPath(currentPath).slice(-1)[0] === name}
                              onClick={() => {
                                setCurrentPath(currentPath ? `${currentPath}/${name}` : name);
                              }}
                              level={1}
                            />
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No subfolders here.
                          </div>
                        )}
                      </div>
                    </nav>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* FILE LIST */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  Files in {currentPath || 'root'}
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-5 w-48" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                ) : filteredDocs.length > 0 ? (
                  <ScrollArea className="h-[560px]">
                    <ul className="divide-y">
                      {filteredDocs.map((doc) => (
                        <li key={doc.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40">
                          <div className="min-w-0 flex items-center gap-3">
                            <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{doc.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(doc.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <FileTypeBadge title={doc.title} />
                            <Button asChild size="sm" variant="outline" className="gap-1">
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                Open <ArrowUpRight className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No files in this folder.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Folder row item */
function FolderRow({ name, active, onClick, level = 0 }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm',
        active ? 'bg-secondary' : 'hover:bg-muted/60',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <span className="inline-flex" style={{ paddingLeft: level * 12 }}>
        <FolderIcon className="h-4 w-4 mr-2 text-muted-foreground" />
        {name}
      </span>
    </button>
  );
}
