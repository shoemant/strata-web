'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  ChevronDown,
  RefreshCw,
  ImageIcon,
  Trash2,
  Clock,
  Wrench,
  CheckCircle2,
  Archive,
} from 'lucide-react';

const MAINTENANCE_BUCKET = 'maintenance';

function statusBadgeVariant(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'secondary';
  if (s === 'in_progress') return 'default';
  return 'outline';
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export default function ManagerMaintenancePage() {
  const { id: buildingId } = useParams();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const [savingStatusId, setSavingStatusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user?.id || !buildingId) return;
    fetchRequests();
  }, [user, buildingId]);

  async function fetchRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(
        `
        id,
        user_id,
        title,
        description,
        status,
        submitted_at,
        updated_at,
        building_id,
        maintenance_request_photos (
          id,
          path,
          created_at
        )
      `
      )
      .eq('building_id', buildingId)
      .order('submitted_at', { ascending: false });

    if (error) console.error('fetchRequests error:', error);

    const hydrated =
      (data || []).map((r) => ({
        ...r,
        photos: (r.maintenance_request_photos || []).map((p) => ({
          ...p,
          publicUrl: supabase.storage
            .from(MAINTENANCE_BUCKET)
            .getPublicUrl(p.path).data.publicUrl,
        })),
      })) || [];

    setRequests(hydrated);
    setLoading(false);
  }

  async function handleSetStatus(requestId, nextStatus) {
    if (!requestId || !nextStatus) return;

    try {
      setSavingStatusId(requestId);

      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('building_id', buildingId);

      if (error) {
        console.error('update status error:', error);
        return;
      }

      await fetchRequests();
    } finally {
      setSavingStatusId(null);
    }
  }

  async function handleDeleteRequest(request) {
    if (!request?.id) return;

    const ok = window.confirm(
      'Delete this maintenance request? This will also delete its photos.'
    );
    if (!ok) return;

    try {
      setDeletingId(request.id);

      // Delete storage files FIRST
      const paths = (request.photos || []).map((p) => p.path).filter(Boolean);

      if (paths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from(MAINTENANCE_BUCKET)
          .remove(paths);

        if (storageErr) {
          console.error('storage remove error:', storageErr);
          // You can choose to return here if you want to enforce full cleanup
        }
      }

      // Delete row (photo rows cascade)
      const { error: delErr } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', request.id)
        .eq('building_id', buildingId);

      if (delErr) {
        console.error('delete request error:', delErr);
        return;
      }

      await fetchRequests();
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const key = (r.status || 'pending').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()];
  }, [requests]);

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 overflow-auto">
      <div className="w-full px-6 pt-0 pb-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Maintenance requests</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No maintenance requests for this building yet.
              </p>
            )}

            {requests.length > 0 &&
              grouped.map(([statusKey, items]) => (
                <Collapsible key={statusKey} defaultOpen>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between hover:bg-transparent px-0"
                    >
                      <span className="capitalize">
                        {statusKey.replaceAll('_', ' ')}{' '}
                        <span className="text-muted-foreground">
                          · {items.length}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>

                  <Separator className="my-3" />

                  <CollapsibleContent className="space-y-3">
                    {items.map((r) => (
                      <Card key={r.id}>
                        <CardHeader className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {r.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Submitted: {formatDateTime(r.submitted_at)}
                                {r.updated_at &&
                                  ` · Updated: ${formatDateTime(r.updated_at)}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Requester:{' '}
                                <span className="font-mono">{r.user_id}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant={statusBadgeVariant(r.status)}>
                                {(r.status || 'pending').replaceAll('_', ' ')}
                              </Badge>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRequest(r)}
                                disabled={deletingId === r.id}
                                className="text-red-600 hover:bg-transparent hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {deletingId === r.id ? 'Deleting…' : 'Delete'}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {r.description}
                          </p>

                          {/* Status controls */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium mr-2">
                              Set status:
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingStatusId === r.id}
                              onClick={() => handleSetStatus(r.id, 'pending')}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Pending
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingStatusId === r.id}
                              onClick={() =>
                                handleSetStatus(r.id, 'in_progress')
                              }
                            >
                              <Wrench className="h-4 w-4 mr-2" />
                              In progress
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingStatusId === r.id}
                              onClick={() => handleSetStatus(r.id, 'resolved')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Resolved
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingStatusId === r.id}
                              onClick={() => handleSetStatus(r.id, 'closed')}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Closed
                            </Button>

                            {savingStatusId === r.id && (
                              <span className="text-xs text-muted-foreground">
                                Saving…
                              </span>
                            )}
                          </div>

                          {/* Photos */}
                          <div className="space-y-2">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Photos
                            </div>

                            {(!r.photos || r.photos.length === 0) && (
                              <p className="text-xs text-muted-foreground">
                                No photos uploaded.
                              </p>
                            )}

                            {r.photos?.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {r.photos.map((p) => (
                                  <div
                                    key={p.id}
                                    className="relative aspect-square overflow-hidden rounded-md border"
                                  >
                                    <Image
                                      src={p.publicUrl}
                                      alt="Maintenance photo"
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
