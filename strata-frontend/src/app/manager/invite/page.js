'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, RotateCcw, Users, XCircle } from 'lucide-react';

import InviteForm from '@/components/manager/invitations/InviteForm';
import BulkCsvUploader from '@/components/manager/invitations/BulkCsvUploader';

export default function ManagerInviteHubPage() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [buildingId, setBuildingId] = useState(null);
  const [managerBuildings, setManagerBuildings] = useState([]);

  // Data lists
  const [units, setUnits] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [pageStatus, setPageStatus] = useState({ ok: null, msg: '' });

  // Resolve all buildings managed by this user (and default buildingId)
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: mbRows, error: mbErr } = await supabase
        .from('manager_buildings')
        .select('building_id')
        .eq('user_id', session.user.id);

      if (mbErr) {
        console.error('Error fetching manager_buildings:', mbErr);
        setPageStatus({ ok: false, msg: 'Unable to resolve buildings for this manager.' });
        return;
      }
      const ids = (mbRows || []).map(r => r.building_id).filter(Boolean);
      if (!ids.length) {
        setPageStatus({ ok: false, msg: 'No buildings are assigned to this manager.' });
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
      // Default selected building if none chosen yet
      setBuildingId(prev => prev ?? (bList?.[0]?.id ?? null));
    })();
  }, [session, supabase]);

  // Load units + pending invites + recent members
  useEffect(() => {
    if (!buildingId) return;
    let cancel = false;
    (async () => {
      setLoadingLists(true);

      const unitsQ = supabase
        .from('units')
        .select('id,label,floor')
        .eq('building_id', buildingId)
        .order('floor', { ascending: true });

      const invitesQ = supabase
        .from('invitations')
        .select('id,email,role,building_id,unit_id,token,status,sent_at,expires_at')
        .eq('building_id', buildingId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      const membersQ = supabase
        .from('memberships')
        .select(`
          id,user_id,role,unit_id,created_at,
          units!memberships_unit_id_fkey(id,label),
          user_profiles!memberships_user_id_fkey(id,email)
        `)
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })
        .limit(25);

      const [{ data: unitData }, { data: inviteData }, { data: memberData }] = await Promise.all([
        unitsQ,
        invitesQ,
        membersQ,
      ]);
      if (cancel) return;

      setUnits(unitData || []);
      setPendingInvites(inviteData || []);

      const mappedMembers = (memberData || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        unit_id: m.unit_id,
        created_at: m.created_at,
        user_email: m.user_profiles?.email ?? null,
        unit_label: m.units?.label ?? null,
      }));
      setMembers(mappedMembers);

      setLoadingLists(false);
    })();

    return () => {
      cancel = true;
    };
  }, [buildingId, supabase]);

  async function refreshLists() {
    if (!buildingId) return;
    const [{ data: inviteData }, { data: memberData }] = await Promise.all([
      supabase
        .from('invitations')
        .select('id,email,role,building_id,unit_id,token,status,sent_at,expires_at')
        .eq('building_id', buildingId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false }),
      supabase
        .from('memberships')
        .select(`
          id,user_id,role,unit_id,created_at,
          units!memberships_unit_id_fkey(id,label),
          user_profiles!memberships_user_id_fkey(id,email)
        `)
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    setPendingInvites(inviteData || []);
    const mappedMembers = (memberData || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      unit_id: m.unit_id,
      created_at: m.created_at,
      user_email: m.user_profiles?.email ?? null,
      unit_label: m.units?.label ?? null,
    }));
    setMembers(mappedMembers);
  }

  // Pending invites actions
  async function handleResend(invId) {
    setPageStatus({ ok: null, msg: '' });
    const { error } = await supabase.functions.invoke('send-invite-email', { body: { invitation_id: invId } });
    if (error) {
      console.error('Resend failed:', error);
      setPageStatus({ ok: false, msg: 'Failed to resend email.' });
    } else {
      setPageStatus({ ok: true, msg: 'Invite email resent.' });
    }
  }

  async function handleCancel(invId) {
    setPageStatus({ ok: null, msg: '' });
    const { error } = await supabase.from('invitations').update({ status: 'cancelled' }).eq('id', invId);
    if (error) {
      console.error('Cancel failed:', error);
      setPageStatus({ ok: false, msg: 'Failed to cancel invite.' });
    } else {
      setPendingInvites((prev) => prev.filter((p) => p.id !== invId));
      setPageStatus({ ok: true, msg: 'Invite cancelled.' });
    }
  }

  if (!session) return <p className="p-6">Loading…</p>;

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-16 right-0 bg-background p-6">
        <div className="max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">People &amp; Invitations</h1>
            <Link href="/manager/dashboard">
              <Button variant="ghost" size="sm">Back to Dashboard</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single Invite */}
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
                  buildingId={buildingId}          // default selection
                  buildings={managerBuildings}      // NEW: provide all manager buildings
                  onSuccess={async () => { await refreshLists(); }}
                  onError={(msg) => { if (msg) setPageStatus({ ok: false, msg }); }}
                />
              </CardContent>
            </Card>

            {/* CSV Upload */}
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

          {/* Pending Invites */}
          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-3">Unit</div>
                  <div className="col-span-2">Expires</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <ScrollArea className="h-[320px]">
                  {loadingLists ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">Loading…</div>
                  ) : pendingInvites.length ? (
                    <div className="divide-y">
                      {pendingInvites.map((i) => {
                        const unitLabel = units.find((u) => u.id === i.unit_id)?.label ?? '—';
                        return (
                          <div key={i.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                            <div className="col-span-3 truncate">{i.email}</div>
                            <div className="col-span-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-muted">{i.role}</span>
                            </div>
                            <div className="col-span-3">{i.unit_id ? unitLabel : '—'}</div>
                            <div className="col-span-2 text-xs">
                              {i.expires_at ? new Date(i.expires_at).toLocaleDateString() : '—'}
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleResend(i.id)} title="Resend email">
                                <RotateCcw className="h-4 w-4 mr-1" /> Resend
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCancel(i.id)} title="Cancel invite">
                                <XCircle className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-sm text-muted-foreground">No pending invites.</div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Recent Members */}
          <Card>
            <CardHeader>
              <CardTitle>Recent members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-3">Unit</div>
                  <div className="col-span-3">Added</div>
                </div>
                <ScrollArea className="h-[320px]">
                  {loadingLists ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">Loading…</div>
                  ) : members.length ? (
                    <div className="divide-y">
                      {members.map((m) => (
                        <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                          <div className="col-span-4 truncate">{m.user_email ?? '—'}</div>
                          <div className="col-span-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-muted">{m.role}</span>
                          </div>
                          <div className="col-span-3">{m.unit_label ?? '—'}</div>
                          <div className="col-span-3 text-xs">
                            {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-sm text-muted-foreground">No members found.</div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
