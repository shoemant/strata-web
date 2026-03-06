'use client';

import React, { useEffect, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, RotateCcw, Users, XCircle } from 'lucide-react';

import InviteForm from '@/components/manager/invitations/InviteForm';
import BulkCsvUploader from '@/components/manager/invitations/BulkCsvUploader';

import Link from 'next/link';

export default function ManagerInviteHubPage() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [buildingId, setBuildingId] = useState(null);
  const [managerBuildings, setManagerBuildings] = useState([]);

  const [units, setUnits] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

  const [recentUnitMembers, setRecentUnitMembers] = useState([]);
  const [recentManagers, setRecentManagers] = useState([]);

  const [loadingLists, setLoadingLists] = useState(true);
  const [pageStatus, setPageStatus] = useState({ ok: null, msg: '' });

  useEffect(() => {
    if (!session?.user?.id) return;

    (async () => {
      const { data: mbRows, error: mbErr } = await supabase
        .from('manager_buildings')
        .select('building_id')
        .eq('user_id', session.user.id);

      if (mbErr) {
        console.error('Error fetching manager_buildings:', mbErr);
        setPageStatus({
          ok: false,
          msg: 'Unable to resolve buildings for this manager.',
        });
        return;
      }

      const ids = (mbRows || []).map((r) => r.building_id).filter(Boolean);
      if (!ids.length) {
        setPageStatus({
          ok: false,
          msg: 'No buildings are assigned to this manager.',
        });
        return;
      }

      const { data: bList, error: bErr } = await supabase
        .from('buildings')
        .select('id,name,address')
        .in('id', ids);

      if (bErr) {
        console.error('Error fetching building records:', bErr);
        setPageStatus({ ok: false, msg: 'Failed to load building records.' });
        return;
      }

      setManagerBuildings(bList || []);
      setBuildingId((prev) => prev ?? bList?.[0]?.id ?? null);
    })();
  }, [session, supabase]);

  async function loadListsForBuilding(bid) {
    if (!bid) return;
    setLoadingLists(true);

    const unitsQ = supabase
      .from('units')
      .select('id,label,floor,building_id')
      .eq('building_id', bid)
      .order('floor', { ascending: true });

    const invitesQ = supabase
      .from('invitations')
      .select(
        'id,email,role,building_id,unit_id,status,sent_at,expires_at,token_prefix,created_by'
      )
      .eq('building_id', bid)
      .in('status', ['pending', 'expired'])
      .order('sent_at', { ascending: false });

    const unitMembersQ = supabase
      .from('unit_memberships')
      .select(
        `
        id,user_id,role,unit_id,created_at,
        units!unit_memberships_unit_id_fkey(id,label,building_id),
        user_profiles!unit_memberships_user_id_fkey(id,email)
      `
      )
      .order('created_at', { ascending: false })
      .limit(25);

    const managersQ = supabase
      .from('manager_buildings')
      .select(
        `
        id,user_id,building_id,created_at,
        user_profiles!manager_buildings_user_id_fkey(id,email)
      `
      )
      .eq('building_id', bid)
      .order('created_at', { ascending: false })
      .limit(25);

    const [
      { data: unitData, error: unitsErr },
      { data: inviteData, error: invitesErr },
      { data: unitMemberData, error: unitMembersErr },
      { data: managerData, error: managersErr },
    ] = await Promise.all([unitsQ, invitesQ, unitMembersQ, managersQ]);

    if (unitsErr) console.error('Units load error:', unitsErr);
    if (invitesErr) console.error('Invites load error:', invitesErr);
    if (unitMembersErr)
      console.error('Unit members load error:', unitMembersErr);
    if (managersErr) console.error('Managers load error:', managersErr);

    setUnits(unitData || []);
    setPendingInvites(inviteData || []);

    const filteredUnitMembers = (unitMemberData || [])
      .filter((m) => m.units?.building_id === bid)
      .map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        unit_id: m.unit_id,
        created_at: m.created_at,
        user_email: m.user_profiles?.email ?? null,
        unit_label: m.units?.label ?? null,
      }));

    setRecentUnitMembers(filteredUnitMembers);

    const mappedManagers = (managerData || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: 'manager',
      unit_label: null,
      created_at: m.created_at,
      user_email: m.user_profiles?.email ?? null,
    }));

    setRecentManagers(mappedManagers);

    setLoadingLists(false);
  }

  useEffect(() => {
    if (!buildingId) return;
    let cancel = false;

    (async () => {
      await loadListsForBuilding(buildingId);
      if (cancel) return;
    })();

    return () => {
      cancel = true;
    };
  }, [buildingId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshLists() {
    if (!buildingId) return;
    await loadListsForBuilding(buildingId);
  }

  async function getBuildingLabel(bid) {
    const found = managerBuildings.find((b) => b.id === bid);
    return found?.name || found?.address || bid;
  }

  async function handleResend(inviteRow) {
    setPageStatus({ ok: null, msg: '' });
    try {
      const { data: created, error: createErr } = await supabase.rpc(
        'create_invite',
        {
          p_email: inviteRow.email,
          p_role: inviteRow.role,
          p_building_id: inviteRow.building_id,
          p_unit_id: inviteRow.unit_id,
          p_note: null,
        }
      );

      if (createErr) {
        console.error('Resend create_invite failed:', createErr);
        setPageStatus({ ok: false, msg: 'Failed to rotate invite token.' });
        return;
      }

      const row = Array.isArray(created) ? created[0] : created;
      const buildingLabel = await getBuildingLabel(inviteRow.building_id);
      const unitLabel = inviteRow.unit_id
        ? (units.find((u) => u.id === inviteRow.unit_id)?.label ?? null)
        : null;

      const { error: sendErr } = await supabase.functions.invoke(
        'send-invite-email',
        {
          body: {
            email: inviteRow.email,
            role: inviteRow.role,
            building_id: inviteRow.building_id,
            building_label: buildingLabel,
            unit_id: inviteRow.unit_id,
            unit_label: unitLabel,
            token: row?.token,
            expires_at: row?.expires_at,
          },
        }
      );

      if (sendErr) {
        console.error('Resend send-invite-email failed:', sendErr);
        setPageStatus({
          ok: false,
          msg: 'Invite rotated, but failed to resend email.',
        });
        return;
      }

      setPageStatus({ ok: true, msg: 'Invite email resent (token rotated).' });
      await refreshLists();
    } catch (e) {
      console.error(e);
      setPageStatus({ ok: false, msg: 'Failed to resend invite.' });
    }
  }

  async function handleCancel(invId) {
    setPageStatus({ ok: null, msg: '' });
    const { data, error } = await supabase.rpc('cancel_invite', {
      p_invite_id: invId,
    });

    if (error) {
      console.error('Cancel failed:', error);
      setPageStatus({ ok: false, msg: 'Failed to cancel invite.' });
      return;
    }

    if (!data) {
      setPageStatus({ ok: false, msg: 'Invite could not be cancelled.' });
      return;
    }

    setPendingInvites((prev) => prev.filter((p) => p.id !== invId));
    setPageStatus({ ok: true, msg: 'Invite cancelled.' });
  }

  if (!session) return <p className="p-6">Loading…</p>;

  const combinedRecent = [...recentManagers, ...recentUnitMembers].sort(
    (a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    }
  );

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-0 md:left-16 right-0 bg-background p-6 pt-12">
        <div className="max-w-full space-y-8 mt-10 sm:mt-8">
          {pageStatus.ok === false && pageStatus.msg ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {pageStatus.msg}
            </div>
          ) : null}
          {pageStatus.ok === true && pageStatus.msg ? (
            <div className="rounded-md border border-emerald-300/40 bg-emerald-50/40 p-3 text-sm text-emerald-700">
              {pageStatus.msg}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Link href={`/manager/buildings/${buildingId}/invitations`}>
              <Button variant="outline">Invitation history</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Send an Invite
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InviteForm
                  supabase={supabase}
                  session={session}
                  buildingId={buildingId}
                  buildings={managerBuildings}
                  actorRole="manager"
                  onSuccess={async () => {
                    await refreshLists();
                  }}
                  onError={(msg) => {
                    if (msg) setPageStatus({ ok: false, msg });
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Bulk Upload (CSV)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BulkCsvUploader
                  supabase={supabase}
                  buildingId={buildingId}
                  buildingLabel={
                    managerBuildings.find((b) => b.id === buildingId)?.name ||
                    null
                  }
                  onSuccess={async () => {
                    await refreshLists();
                  }}
                  onError={(msg) => {
                    if (msg) setPageStatus({ ok: false, msg });
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                      <div className="col-span-3">Email</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-3">Unit</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1">Expires</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>

                    <ScrollArea className="h-[320px]">
                      {loadingLists ? (
                        <div className="px-3 py-6 text-sm text-muted-foreground">
                          Loading…
                        </div>
                      ) : pendingInvites.length ? (
                        <div className="divide-y">
                          {pendingInvites.map((i) => {
                            const unitLabel =
                              units.find((u) => u.id === i.unit_id)?.label ??
                              '—';

                            return (
                              <div
                                key={i.id}
                                className="grid grid-cols-12 gap-2 items-center px-3 py-2"
                              >
                                <div className="col-span-3 truncate">
                                  {i.email}
                                </div>

                                <div className="col-span-2">
                                  <span className="px-2 py-0.5 rounded text-xs bg-muted">
                                    {i.role}
                                  </span>
                                </div>

                                <div className="col-span-3">
                                  {i.unit_id ? unitLabel : '—'}
                                </div>

                                <div className="col-span-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      i.status === 'pending'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {i.status}
                                  </span>
                                </div>

                                <div className="col-span-1 text-xs">
                                  {i.expires_at
                                    ? new Date(
                                        i.expires_at
                                      ).toLocaleDateString()
                                    : '—'}
                                </div>

                                <div className="col-span-1 flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResend(i)}
                                    title="Resend email (rotates token)"
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Resend
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancel(i.id)}
                                    disabled={i.status !== 'pending'}
                                    title={
                                      i.status !== 'pending'
                                        ? 'Only pending invites can be cancelled'
                                        : 'Cancel invite'
                                    }
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-6 text-sm text-muted-foreground">
                          No pending invites.
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[920px]">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                      <div className="col-span-5">Email</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-3">Unit</div>
                      <div className="col-span-2">Added</div>
                    </div>

                    <ScrollArea className="h-[320px]">
                      {loadingLists ? (
                        <div className="px-3 py-6 text-sm text-muted-foreground">
                          Loading…
                        </div>
                      ) : combinedRecent.length ? (
                        <div className="divide-y">
                          {combinedRecent.map((m) => (
                            <div
                              key={`${m.role}-${m.id}`}
                              className="grid grid-cols-12 gap-2 items-center px-3 py-2"
                            >
                              <div className="col-span-5 truncate">
                                {m.user_email ?? '—'}
                              </div>

                              <div className="col-span-2">
                                <span className="px-2 py-0.5 rounded text-xs bg-muted">
                                  {m.role}
                                </span>
                              </div>

                              <div className="col-span-3">
                                {m.unit_label ?? '—'}
                              </div>

                              <div className="col-span-2 text-xs">
                                {m.created_at
                                  ? new Date(m.created_at).toLocaleString()
                                  : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-6 text-sm text-muted-foreground">
                          No members found.
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
