'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';
import { RefreshCw, Home, Trash2, ArrowLeft, UserPlus } from 'lucide-react';

/* -------------------- helpers -------------------- */

function normalize(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function safeUnitLabel(u) {
  if (!u) return '—';
  const unitNum = u.unit_number ?? u.number ?? u.name ?? null;
  return unitNum ? String(unitNum) : '—';
}

function sortUnitLabel(a, b) {
  const A = String(a ?? '');
  const B = String(b ?? '');
  const aNum = Number(A);
  const bNum = Number(B);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
  return A.localeCompare(B);
}

/* -------------------- page -------------------- */

export default function ManagerResidentsPage() {
  const params = useParams();
  const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const supabase = useSupabaseClient();
  const user = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | owner | tenant

  const [residents, setResidents] = useState([]);
  const [units, setUnits] = useState([]);

  // dialogs / actions
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [activeResident, setActiveResident] = useState(null);

  // tenant edit
  const [selectedUnitId, setSelectedUnitId] = useState(''); // '' means clear

  // owner edit (multi-unit)
  const [selectedOwnerUnitIds, setSelectedOwnerUnitIds] = useState(new Set());

  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!user?.id || !buildingId) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, buildingId]);

  async function fetchAll() {
    setLoading(true);
    setError(null);

    try {
      // 1) Residents in this building
      const { data: people, error: peopleErr } = await supabase
        .from('user_profiles')
        .select(
          `
          id,
          full_name,
          email,
          role,
          building_id,
          unit_id,
          units:unit_id (
            id,
            unit_number
          )
        `
        )
        .eq('building_id', buildingId)
        .in('role', ['owner', 'tenant'])
        .order('full_name', { ascending: true });

      if (peopleErr) throw peopleErr;

      // 2) Units for building (for assigning)
      const { data: unitRows, error: unitErr } = await supabase
        .from('units')
        .select('id, unit_number')
        .eq('building_id', buildingId)
        .order('unit_number', { ascending: true });

      if (unitErr) throw unitErr;

      // 3) Memberships for THIS building’s units only
      // units!inner ensures the join must exist, and we can filter by units.building_id
      const { data: memberships, error: memErr } = await supabase
        .from('unit_memberships')
        .select(
          `
          id,
          user_id,
          unit_id,
          role,
          units!inner (
            id,
            unit_number,
            building_id
          )
        `
        )
        .in('role', ['owner', 'tenant'])
        .eq('units.building_id', buildingId);

      if (memErr) throw memErr;

      const memMap = new Map();
      (memberships || []).forEach((m) => {
        if (!memMap.has(m.user_id)) memMap.set(m.user_id, []);
        memMap.get(m.user_id).push({
          id: m.id,
          user_id: m.user_id,
          unit_id: m.unit_id,
          role: m.role,
          unit_number: m.units?.unit_number ?? '—',
        });
      });

      setUnits(unitRows || []);

      // attach memberships onto each resident
      setResidents(
        (people || []).map((p) => ({
          ...p,
          memberships: memMap.get(p.id) || [],
        }))
      );
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Could not load residents.');
    } finally {
      setLoading(false);
    }
  }

  async function hardRefresh() {
    try {
      setRefreshing(true);
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }

  const filteredResidents = useMemo(() => {
    const q = normalize(search);

    return (residents || []).filter((r) => {
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (!q) return true;

      const name = normalize(r.full_name);
      const email = normalize(r.email);

      const tenantUnit = normalize(r.units?.unit_number);

      const ownerUnits = (r.memberships || [])
        .filter((m) => m.role === 'owner')
        .map((m) => normalize(m.unit_number))
        .join(' ');

      return (
        name.includes(q) ||
        email.includes(q) ||
        tenantUnit.includes(q) ||
        ownerUnits.includes(q) ||
        q === normalize(r.role)
      );
    });
  }, [residents, search, roleFilter]);

  const counts = useMemo(() => {
    let owners = 0;
    let tenants = 0;
    for (const r of residents) {
      if (r.role === 'owner') owners++;
      if (r.role === 'tenant') tenants++;
    }
    return { total: residents.length, owners, tenants };
  }, [residents]);

  function openEdit(resident) {
    setError(null);
    setActiveResident(resident);

    if (resident?.role === 'owner') {
      const owned = (resident.memberships || [])
        .filter((m) => m.role === 'owner')
        .map((m) => String(m.unit_id));

      const next = new Set(owned);

      // Also include the profile “primary” unit if it exists
      if (resident.unit_id) next.add(String(resident.unit_id));

      setSelectedOwnerUnitIds(next);
      setSelectedUnitId('');
    } else {
      setSelectedUnitId(resident?.unit_id ? String(resident.unit_id) : '');
      setSelectedOwnerUnitIds(new Set());
    }

    setEditOpen(true);
  }

  function openRemove(resident) {
    setError(null);
    setActiveResident(resident);
    setRemoveOpen(true);
  }

  async function handleSaveUnit() {
    if (!activeResident?.id) return;

    try {
      setSaving(true);
      setError(null);

      if (activeResident.role === 'tenant') {
        const newUnitId = selectedUnitId ? selectedUnitId : null;

        // 1) user_profiles.unit_id is tenant's residence
        const { error: updErr } = await supabase
          .from('user_profiles')
          .update({ unit_id: newUnitId })
          .eq('id', activeResident.id);

        if (updErr) throw updErr;

        // 2) unit_memberships: tenant must have at most one
        const { error: delErr } = await supabase
          .from('unit_memberships')
          .delete()
          .eq('user_id', activeResident.id)
          .eq('role', 'tenant');

        if (delErr) throw delErr;

        if (newUnitId) {
          const { error: insErr } = await supabase
            .from('unit_memberships')
            .insert({
              user_id: activeResident.id,
              unit_id: newUnitId,
              role: 'tenant',
            });

          if (insErr && insErr.code !== '23505') throw insErr;
        }
      }

      if (activeResident.role === 'owner') {
        const current = new Set(
          (activeResident.memberships || [])
            .filter((m) => m.role === 'owner')
            .map((m) => String(m.unit_id))
        );

        const next = selectedOwnerUnitIds;

        const toAdd = [];
        const toRemove = [];

        for (const uid of next) if (!current.has(uid)) toAdd.push(uid);
        for (const uid of current) if (!next.has(uid)) toRemove.push(uid);

        if (toRemove.length) {
          const { error: delErr } = await supabase
            .from('unit_memberships')
            .delete()
            .eq('user_id', activeResident.id)
            .eq('role', 'owner')
            .in('unit_id', toRemove);

          if (delErr) throw delErr;
        }

        if (toAdd.length) {
          const payload = toAdd.map((uid) => ({
            user_id: activeResident.id,
            unit_id: uid,
            role: 'owner',
          }));

          const { error: insErr } = await supabase
            .from('unit_memberships')
            .insert(payload);

          if (insErr && insErr.code !== '23505') throw insErr;
        }

        // We do NOT force user_profiles.unit_id for owners.
      }

      setEditOpen(false);
      setActiveResident(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Could not update unit(s).');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromBuilding() {
    if (!activeResident?.id) return;

    try {
      setRemoving(true);
      setError(null);

      // Remove all memberships for this user
      const { error: delMembershipErr } = await supabase
        .from('unit_memberships')
        .delete()
        .eq('user_id', activeResident.id);

      if (delMembershipErr) throw delMembershipErr;

      // Remove from building + clear unit in profile
      const { error: updErr } = await supabase
        .from('user_profiles')
        .update({ building_id: null, unit_id: null })
        .eq('id', activeResident.id);

      if (updErr) throw updErr;

      setRemoveOpen(false);
      setActiveResident(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Could not remove resident.');
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Total: {counts.total}</Badge>
              <Badge variant="secondary">Owners: {counts.owners}</Badge>
              <Badge variant="secondary">Tenants: {counts.tenants}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/manager/buildings/${buildingId}/invite`}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Link>
            </Button>

            <Button
              variant="outline"
              onClick={hardRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Search and filters</CardTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, unit (e.g., 1203)…"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="owner">Owners</SelectItem>
                    <SelectItem value="tenant">Tenants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Separator />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            {filteredResidents.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No residents found.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResidents.map((r) => {
                  const ownerUnitsFromMemberships = (r.memberships || [])
                    .filter((m) => m.role === 'owner')
                    .map((m) => ({
                      unit_id: String(m.unit_id),
                      unit_number: m.unit_number ?? '—',
                    }));

                  const primaryUnit =
                    r.unit_id && r.units?.unit_number
                      ? {
                          unit_id: String(r.unit_id),
                          unit_number: String(r.units.unit_number),
                        }
                      : null;

                  const ownerUnitMap = new Map();
                  if (primaryUnit)
                    ownerUnitMap.set(primaryUnit.unit_id, primaryUnit);
                  for (const u of ownerUnitsFromMemberships)
                    ownerUnitMap.set(u.unit_id, u);

                  const ownerUnits = Array.from(ownerUnitMap.values()).sort(
                    (a, b) => sortUnitLabel(a.unit_number, b.unit_number)
                  );

                  return (
                    <div
                      key={r.id}
                      className="rounded-lg border p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">
                            {r.full_name || 'Unknown'}
                          </div>
                          <Badge variant="secondary" className="text-[11px]">
                            {r.role}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground truncate">
                          {r.email || 'No email'}
                        </div>

                        <div className="mt-1 text-sm flex items-start gap-2">
                          <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">
                            {r.role === 'owner' ? 'Units owned:' : 'Unit:'}
                          </span>

                          {r.role === 'owner' ? (
                            ownerUnits.length ? (
                              <div className="flex flex-wrap gap-1">
                                {ownerUnits.map((u) => (
                                  <Badge
                                    key={u.unit_id}
                                    variant={
                                      primaryUnit?.unit_id === u.unit_id
                                        ? 'default'
                                        : 'secondary'
                                    }
                                    className="text-[11px]"
                                    title={
                                      primaryUnit?.unit_id === u.unit_id
                                        ? 'Primary unit (profile)'
                                        : 'Owned unit'
                                    }
                                  >
                                    Unit {u.unit_number}
                                    {primaryUnit?.unit_id === u.unit_id
                                      ? ' · Primary'
                                      : ''}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="font-medium">—</span>
                            )
                          ) : (
                            <span className="font-medium">
                              {safeUnitLabel(r.units)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(r)}
                        >
                          {r.role === 'owner' ? 'Edit units' : 'Edit unit'}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openRemove(r)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Unit(s) Dialog */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setActiveResident(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activeResident?.role === 'owner' ? 'Edit units' : 'Edit unit'}
              </DialogTitle>
              <DialogDescription>
                {activeResident?.role === 'owner'
                  ? 'Owners can be linked to multiple units.'
                  : 'Tenants can only be assigned to one unit.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Resident:</span>{' '}
                <span className="font-medium">
                  {activeResident?.full_name ||
                    activeResident?.email ||
                    'Unknown'}
                </span>
              </div>

              {activeResident?.role === 'owner' ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Units owned
                  </Label>

                  <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-1">
                    {units.map((u) => {
                      const uid = String(u.id);
                      const checked = selectedOwnerUnitIds.has(uid);

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedOwnerUnitIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(uid)) next.delete(uid);
                              else next.add(uid);
                              return next;
                            });
                          }}
                          className={cn(
                            'w-full flex items-center justify-between rounded-md px-2 py-2 text-sm border transition',
                            checked ? 'bg-muted/40' : 'bg-background'
                          )}
                        >
                          <span>Unit {u.unit_number}</span>
                          <span
                            className={cn(
                              'text-xs',
                              checked
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                            {checked ? 'Selected' : 'Click to add'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Tip: click a unit to toggle it on or off.
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit</Label>

                  <Select
                    value={selectedUnitId || '__none__'}
                    onValueChange={(v) =>
                      setSelectedUnitId(v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit (or clear)" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="__none__">No unit (clear)</SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          Unit {u.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="text-xs text-muted-foreground">
                    Note: clearing a unit removes their tenant unit membership
                    row.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveUnit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Dialog */}
        <Dialog
          open={removeOpen}
          onOpenChange={(open) => {
            setRemoveOpen(open);
            if (!open) setActiveResident(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove resident</DialogTitle>
              <DialogDescription>
                This removes the resident from the building (clears building +
                unit) and deletes any unit membership rows for them. They will
                lose access to building data.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">
                {activeResident?.full_name ||
                  activeResident?.email ||
                  'Unknown'}
              </div>
              <div className="text-muted-foreground">
                {activeResident?.email || 'No email'} · {activeResident?.role}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveOpen(false)}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveFromBuilding}
                disabled={removing}
              >
                {removing ? 'Removing…' : 'Remove'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
