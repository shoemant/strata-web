'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  FolderPlus,
  File as FileIcon,
} from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.buildingId
 * @param {Object} props.capabilities
 * @param {boolean} props.capabilities.canUpload
 * @param {boolean} props.capabilities.canCreateFolder
 * @param {boolean} props.capabilities.canRename
 * @param {boolean} props.capabilities.canDelete
 * @param {(ctx: {buildingId: string, currentPath: string, refresh: () => Promise<void>}) => React.ReactNode} [props.renderActions]
 *        Optional: render role-specific action buttons (Upload/Create/Rename/Delete UI).
 *        This keeps the browser generic.
 */
export default function DocumentsBrowser({
  buildingId,
  capabilities,
  renderActions,
}) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [currentPath, setCurrentPath] = useState('');
  const [childFolders, setChildFolders] = useState([]);
  const [docs, setDocs] = useState([]);

  const isAuthed = Boolean(session?.user?.id);

  const crumbs = useMemo(
    () => (currentPath ? currentPath.split('/').filter(Boolean) : []),
    [currentPath]
  );
  const prefix = useMemo(
    () => (currentPath ? `${currentPath}/` : ''),
    [currentPath]
  );

  function goUp() {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  }

  function goToCrumb(idx) {
    if (idx < 0) return setCurrentPath('');
    setCurrentPath(crumbs.slice(0, idx + 1).join('/'));
  }

  function openChild(seg) {
    setCurrentPath(currentPath ? `${currentPath}/${seg}` : seg);
  }

  async function refreshFiles() {
    let q = supabase
      .from('documents')
      .select('*')
      .eq('building_id', buildingId)
      .eq('is_folder', false)
      .order('created_at', { ascending: false });

    if (currentPath) q = q.eq('folder', currentPath);
    else q = q.or('folder.eq.,folder.is.null');

    const { data, error } = await q;
    if (error) {
      console.error('Error loading documents:', error);
      setDocs([]);
      return;
    }
    setDocs(data || []);
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
    const looksLikeParentModel = rows.some(
      (r) => (r.folder || '') === (currentPath || '')
    );

    let items = [];

    if (looksLikeParentModel) {
      const immediate = rows.filter(
        (r) => (r.folder || '') === (currentPath || '')
      );
      items = immediate
        .map((r) => ({ id: r.id, segment: r.title, title: r.title }))
        .sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const immediateSegs = new Set();
      rows.forEach((row) => {
        const f = row.folder || '';
        if (!f.startsWith(pref)) return;
        const remainder = f.slice(pref.length);
        if (!remainder || remainder.includes('/')) return;
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
          return { id: exact ? exact.id : null, segment, title };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    setChildFolders(items);
  }

  async function refreshAll() {
    await Promise.all([refreshFolders(), refreshFiles()]);
  }

  useEffect(() => {
    if (!buildingId || !isAuthed) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isAuthed, supabase, currentPath]);

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

            {/* Role-specific actions injected here */}
            {renderActions?.({
              buildingId,
              currentPath,
              refresh: refreshAll,
              capabilities,
            })}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border relative">
            <div className="grid grid-cols-[24px_1fr] items-center px-3 py-2 text-xs uppercase text-muted-foreground border-b">
              <div />
              <div>Name</div>
            </div>

            <ScrollArea className="h-[540px]">
              <div className="divide-y">
                {childFolders?.length > 0 &&
                  childFolders.map((f) => (
                    <div
                      key={`folder-${f.segment}`}
                      className="grid grid-cols-[24px_1fr] items-center px-3 py-2 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-center">
                        <FolderPlus className="h-4 w-4" />
                      </div>
                      <button
                        className="text-left hover:text-primary"
                        onClick={() => openChild(f.segment)}
                        title={`Open ${f.title}`}
                      >
                        {f.title}
                      </button>
                    </div>
                  ))}

                {docs?.length > 0 &&
                  docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="grid grid-cols-[24px_1fr] items-center px-3 py-2 hover:bg-muted/40"
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
                    </div>
                  ))}

                {!childFolders?.length && !docs?.length && (
                  <div className="px-3 py-10 text-sm text-muted-foreground text-center">
                    This folder is empty.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
