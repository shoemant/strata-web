'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

export default function DesignatePollCreatorsDialog({
  buildingId,
  trigger, // optional custom trigger button
  canDesignate = null, // optional: pass boolean if you already know; otherwise we’ll just attempt and rely on RLS
}) {
  const supabase = useSupabaseClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [owners, setOwners] = useState([]);
  const [designations, setDesignations] = useState([]); // rows from poll_creator_designations
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const designatedSet = useMemo(() => {
    const s = new Set();
    (designations || []).forEach((d) => s.add(d.user_id));
    return s;
  }, [designations]);

  const filteredOwners = useMemo(() => {
    const q = norm(search);
    if (!q) return owners || [];
    return (owners || []).filter((o) => {
      return norm(o.full_name).includes(q) || norm(o.email).includes(q);
    });
  }, [owners, search]);

  async function load() {
    if (!buildingId) return;

    setLoading(true);
    setError(null);

    try {
      // 1) All owners in this building
      const { data: ownerRows, error: oErr } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, building_id')
        .eq('building_id', buildingId)
        .eq('role', 'owner')
        .order('full_name', { ascending: true });

      if (oErr) throw oErr;
      setOwners(ownerRows || []);

      // 2) Existing designations in this building
      const { data: desRows, error: dErr } = await supabase
        .from('poll_creator_designations')
        .select('id, building_id, user_id, designated_by, created_at')
        .eq('building_id', buildingId);

      if (dErr) throw dErr;
      setDesignations(desRows || []);
    } catch (e) {
      setError(e?.message || 'Failed to load designations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, buildingId]);

  async function toggleDesignation(ownerId) {
    if (!buildingId || !ownerId) return;

    setError(null);

    // If parent provided an explicit canDesignate and it's false, block
    if (canDesignate === false) {
      setError('You do not have permission to designate poll creators.');
      return;
    }

    const isDesignated = designatedSet.has(ownerId);

    try {
      setLoading(true);

      if (isDesignated) {
        // delete designation row
        const row = (designations || []).find((d) => d.user_id === ownerId);
        if (!row?.id) return;

        const { error: delErr } = await supabase
          .from('poll_creator_designations')
          .delete()
          .eq('id', row.id);

        if (delErr) throw delErr;
      } else {
        // create designation row
        const { error: insErr } = await supabase
          .from('poll_creator_designations')
          .insert({
            building_id: buildingId,
            user_id: ownerId,
            designated_by:
              (await supabase.auth.getUser())?.data?.user?.id ?? null,
          });

        if (insErr) throw insErr;
      }

      await load();
    } catch (e) {
      // RLS failures will show up here cleanly
      setError(e?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  }

  const defaultTrigger = (
    <Button type="button" variant="outline">
      Manage poll creators
    </Button>
  );

  // If parent explicitly says can't designate, hide trigger entirely
  if (canDesignate === false) return null;

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger ?? defaultTrigger}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Designate poll creators</DialogTitle>
            <DialogDescription>
              Managers and designated owners can designate other owners as poll
              creators. Only owners can be designated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search owners by name or email…"
            />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredOwners.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No owners found.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto rounded-md border">
                {(filteredOwners || []).map((o) => {
                  const isDesignated = designatedSet.has(o.id);

                  return (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-3 p-3 border-b last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">
                            {o.full_name || 'Unknown'}
                          </div>
                          {isDesignated ? (
                            <Badge>Designated</Badge>
                          ) : (
                            <Badge variant="secondary">Not designated</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {o.email || 'No email'}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant={isDesignated ? 'destructive' : 'default'}
                        size="sm"
                        disabled={loading}
                        onClick={() => toggleDesignation(o.id)}
                      >
                        {isDesignated ? 'Remove' : 'Designate'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
