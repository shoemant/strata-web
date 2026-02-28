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
  Folder,
  File as FileIcon,
} from 'lucide-react';

/**
 * Generic documents browser:
 * - Navigates by parent_id (tree model)
 * - Visibility handled by RLS (documents rows are filtered automatically)
 *
 * @param {Object} props
 * @param {string} props.buildingId
 * @param {Object} props.capabilities
 * @param {(ctx: {buildingId: string, currentFolderId: string|null, crumbs: Array<{id:string,title:string}>, refresh: () => Promise<void>, capabilities: any}) => React.ReactNode} [props.renderActions]
 */
export default function DocumentsBrowser({
  buildingId,
  capabilities,
  renderActions,
}) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const isAuthed = Boolean(session?.user?.id);

  // crumbs = [{id,title}] => currentFolderId = last id or null root
  const [crumbs, setCrumbs] = useState([]);
  const currentFolderId = crumbs.length ? crumbs[crumbs.length - 1].id : null;

  const [childFolders, setChildFolders] = useState([]);
  const [docs, setDocs] = useState([]);

  // Optional: show restricted badge if ACL exists on the item itself.
  // (RLS already enforces visibility; this is just UI signal.)
  const showRestrictedBadges = Boolean(capabilities?.canManageVisibility); // you decide

  const goHome = () => setCrumbs([]);
  const goUp = () => setCrumbs((prev) => prev.slice(0, -1));
  const goToCrumb = (idx) => {
    if (idx < 0) return goHome();
    setCrumbs((prev) => prev.slice(0, idx + 1));
  };
  const openChildFolder = (folderRow) => {
    setCrumbs((prev) => [
      ...prev,
      { id: folderRow.id, title: folderRow.title },
    ]);
  };

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

    let folders = data || [];

    // Optional: add restricted badge for managers
    if (showRestrictedBadges && folders.length) {
      const ids = folders.map((f) => f.id);
      const { data: aclRows, error: aclErr } = await supabase
        .from('document_acl')
        .select('document_id')
        .in('document_id', ids);

      if (!aclErr) {
        const restrictedSet = new Set(
          (aclRows || []).map((r) => r.document_id)
        );
        folders = folders.map((f) => ({
          ...f,
          _restricted: restrictedSet.has(f.id),
        }));
      }
    }

    setChildFolders(folders);
  }

  async function refreshFiles() {
    if (!buildingId || !isAuthed) return;

    let q = supabase
      .from('documents')
      .select('id, title, url, created_at, parent_id, is_folder')
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

    let files = data || [];

    // Optional: add restricted badge for managers
    if (showRestrictedBadges && files.length) {
      const ids = files.map((f) => f.id);
      const { data: aclRows, error: aclErr } = await supabase
        .from('document_acl')
        .select('document_id')
        .in('document_id', ids);

      if (!aclErr) {
        const restrictedSet = new Set(
          (aclRows || []).map((r) => r.document_id)
        );
        files = files.map((f) => ({
          ...f,
          _restricted: restrictedSet.has(f.id),
        }));
      }
    }

    setDocs(files);
  }

  async function refreshAll() {
    await Promise.all([refreshFolders(), refreshFiles()]);
  }

  useEffect(() => {
    if (!buildingId || !isAuthed) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isAuthed, currentFolderId]);

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

            {/* Role-specific actions injected here */}
            {renderActions?.({
              buildingId,
              currentFolderId,
              crumbs,
              refresh: refreshAll,
              capabilities,
            })}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border relative">
            <div className="grid grid-cols-[24px_1fr_auto] items-center px-3 py-2 text-xs uppercase text-muted-foreground border-b">
              <div />
              <div>Name</div>
              <div className="text-right"> </div>
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
                        <Folder className="h-4 w-4" />
                      </div>

                      <button
                        className="text-left hover:text-primary truncate"
                        onClick={() => openChildFolder(f)}
                        title={`Open ${f.title}`}
                      >
                        {f.title}
                      </button>

                      {/* Simple badge (optional) */}
                      <div className="text-right text-xs text-muted-foreground">
                        {f._restricted ? 'Restricted' : ''}
                      </div>
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

                      <div className="text-right text-xs text-muted-foreground">
                        {doc._restricted ? 'Restricted' : ''}
                      </div>
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
