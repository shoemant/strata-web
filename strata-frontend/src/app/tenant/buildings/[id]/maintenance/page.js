'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  ChevronDown,
  Plus,
  Upload,
  RefreshCw,
  ImageIcon,
  Trash2,
} from 'lucide-react';
const MAINTENANCE_BUCKET = 'maintenance';

function statusBadgeVariant(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'secondary';
  if (s === 'in_progress') return 'default';
  return 'outline'; // pending
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

export default function MaintenancePage() {
  const { id: buildingId } = useParams();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  // Upload extra photos to an existing request
  const [uploadingToId, setUploadingToId] = useState(null);

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
        title,
        description,
        status,
        submitted_at,
        updated_at,
        building_id,
        user_id,
        maintenance_request_photos (
          id,
          path,
          created_at
        )
      `
      )
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
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

  function onPickFiles(e) {
    const list = Array.from(e.target.files || []);
    setFiles(list);
  }

  function clearForm() {
    setTitle('');
    setDescription('');
    setFiles([]);
  }

  async function uploadFilesForRequest(requestId, buildingId, fileList) {
    if (!fileList?.length) return [];

    const uploadedPaths = [];

    for (const file of fileList) {
      const safeName = `${Date.now()}-${file.name}`.replaceAll(' ', '_');
      const path = `${buildingId}/${requestId}/${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(MAINTENANCE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (upErr) {
        console.error('upload error:', upErr);
        continue;
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function insertPhotoRows({ requestId, buildingId, paths }) {
    if (!paths?.length) return;

    const payload = paths.map((path) => ({
      request_id: requestId,
      building_id: buildingId,
      user_id: user.id,
      path,
    }));

    const { error } = await supabase
      .from('maintenance_request_photos')
      .insert(payload);

    if (error) console.error('insertPhotoRows error:', error);
  }

  async function handleCreateRequest() {
    if (!user?.id) return;
    if (!buildingId) return;

    if (!title.trim() || !description.trim()) {
      // keep it simple: just do nothing; you can add toast later
      return;
    }

    try {
      setCreating(true);

      // 1) create request row
      const { data: created, error: insErr } = await supabase
        .from('maintenance_requests')
        .insert({
          user_id: user.id,
          building_id: buildingId,
          title: title.trim(),
          description: description.trim(),
          status: 'pending',
        })
        .select('id')
        .single();

      if (insErr) {
        console.error('create request error:', insErr);
        return;
      }

      const requestId = created.id;

      // 2) upload files (if any)
      const paths = await uploadFilesForRequest(requestId, buildingId, files);

      // 3) store photo rows
      await insertPhotoRows({ requestId, buildingId, paths });

      clearForm();
      await fetchRequests();
    } finally {
      setCreating(false);
    }
  }

  async function handleUploadMorePhotos(requestId, e) {
    if (!requestId || !user?.id) return;
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    try {
      setUploadingToId(requestId);

      const paths = await uploadFilesForRequest(requestId, buildingId, picked);
      await insertPhotoRows({ requestId, buildingId, paths });

      await fetchRequests();
    } finally {
      setUploadingToId(null);
      e.target.value = '';
    }
  }

  async function handleDeleteRequest(request) {
    if (!request?.id) return;
    if (!user?.id) return;

    const ok = window.confirm(
      'Delete this maintenance request? This will also delete its photos.'
    );
    if (!ok) return;

    try {
      setDeletingId(request.id);

      // 1) delete storage files FIRST (so storage policy can still verify ownership)
      const paths = (request.photos || []).map((p) => p.path).filter(Boolean);

      if (paths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from(MAINTENANCE_BUCKET)
          .remove(paths);

        if (storageErr) {
          console.error('storage remove error:', storageErr);
          // You can choose to return here, but I prefer not to block deleting the request row
          // return;
        }
      }

      // 2) delete the request row (photo rows will cascade delete)
      const { error: delErr } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', request.id)
        .eq('user_id', user.id)
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

  const hasRequests = requests.length > 0;

  const requestsByStatus = useMemo(() => {
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
    <main className="p-6 space-y-8">
      {/* ---------- Create request ---------- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>New maintenance request</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Title</div>
              <Input
                placeholder="Eg. Leaky faucet in bathroom"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Photos (optional)</div>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} file{files.length !== 1 && 's'} selected
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Description</div>
            <Textarea
              placeholder="Describe the issue, location, and any helpful details."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <Button onClick={handleCreateRequest} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            {creating ? 'Submitting…' : 'Submit request'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Your request will show up below with its current status.
          </p>
        </CardContent>
      </Card>

      {/* ---------- My requests ---------- */}
      <Card>
        <CardHeader>
          <CardTitle>My maintenance requests</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!hasRequests && (
            <p className="text-sm text-muted-foreground">
              You have no maintenance requests yet.
            </p>
          )}

          {hasRequests &&
            requestsByStatus.map(([statusKey, items]) => (
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

                        {/* Photos */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Photos
                            </div>

                            <label className="inline-flex">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) =>
                                  handleUploadMorePhotos(r.id, e)
                                }
                                disabled={uploadingToId === r.id}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingToId === r.id}
                                asChild
                              >
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  {uploadingToId === r.id
                                    ? 'Uploading…'
                                    : 'Add photos'}
                                </span>
                              </Button>
                            </label>
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
    </main>
  );
}
