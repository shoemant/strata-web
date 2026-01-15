'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, XCircle } from 'lucide-react';

export default function OwnerInvitationsHistoryPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const params = useParams();
  const buildingId = params?.id;

  const [building, setBuilding] = useState(null);
  const [ownedUnits, setOwnedUnits] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ ok: null, msg: '' });

  useEffect(() => {
    if (!session?.user?.id || !buildingId) return;

    (async () => {
      setLoading(true);

      const [{ data: b }, { data: um, error: umErr }] = await Promise.all([
        supabase
          .from('buildings')
          .select('id,name')
          .eq('id', buildingId)
          .maybeSingle(),
        supabase
          .from('unit_memberships')
          .select(
            `id,unit_id,role,units!unit_memberships_unit_id_fkey(id,label,building_id)`
          )
          .eq('user_id', session.user.id)
          .eq('role', 'owner'),
      ]);

      setBuilding(b || null);

      if (umErr) {
        console.error(umErr);
        setOwnedUnits([]);
        setInvites([]);
        setLoading(false);
        return;
      }

      const units = (um || [])
        .filter((r) => r.units?.building_id === buildingId)
        .map((r) => ({ id: r.units.id, label: r.units.label }));

      setOwnedUnits(units);

      if (!units.length) {
        setInvites([]);
        setLoading(false);
        return;
      }

      const unitIds = units.map((u) => u.id);

      const { data: inv } = await supabase
        .from('invitations')
        .select('id,email,role,status,sent_at,expires_at,unit_id,created_at')
        .eq('building_id', buildingId)
        .in('unit_id', unitIds)
        .order('created_at', { ascending: false })
        .limit(500);

      setInvites(inv || []);
      setLoading(false);
    })();
  }, [session, buildingId, supabase]);

  const unitsById = useMemo(() => {
    const m = {};
    (ownedUnits || []).forEach((u) => (m[u.id] = u.label));
    return m;
  }, [ownedUnits]);

  async function resend(invite) {
    setStatus({ ok: null, msg: '' });

    const { data: created, error: createErr } = await supabase.rpc(
      'create_invite',
      {
        p_email: invite.email,
        p_role: invite.role,
        p_building_id: buildingId,
        p_unit_id: invite.unit_id,
        p_note: null,
      }
    );

    if (createErr) {
      console.error(createErr);
      setStatus({ ok: false, msg: 'Failed to rotate invite token.' });
      return;
    }

    const row = Array.isArray(created) ? created[0] : created;

    const { error: sendErr } = await supabase.functions.invoke(
      'send-invite-email',
      {
        body: {
          email: invite.email,
          token: row?.token,
          role: invite.role,
          building_id: buildingId,
          building_label: building?.name || buildingId,
          unit_id: invite.unit_id,
          unit_label: invite.unit_id
            ? (unitsById[invite.unit_id] ?? null)
            : null,
          expires_at: row?.expires_at,
        },
      }
    );

    if (sendErr) {
      console.error(sendErr);
      setStatus({ ok: false, msg: 'Invite rotated but email failed.' });
      return;
    }

    setStatus({ ok: true, msg: 'Invite resent (token rotated).' });

    const unitIds = ownedUnits.map((u) => u.id);
    const { data: inv } = await supabase
      .from('invitations')
      .select('id,email,role,status,sent_at,expires_at,unit_id,created_at')
      .eq('building_id', buildingId)
      .in('unit_id', unitIds)
      .order('created_at', { ascending: false })
      .limit(500);

    setInvites(inv || []);
  }

  async function cancel(inviteId) {
    setStatus({ ok: null, msg: '' });
    const { data, error } = await supabase.rpc('cancel_invite', {
      p_invite_id: inviteId,
    });
    if (error || !data) {
      console.error(error);
      setStatus({ ok: false, msg: 'Failed to cancel invite.' });
      return;
    }
    setStatus({ ok: true, msg: 'Invite cancelled.' });
    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: 'cancelled' } : i))
    );
  }

  if (!session) return <div className="p-6">Loading…</div>;

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0 bg-background p-6">
        <div className="max-w-6xl space-y-6 mt-10 sm:mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Invitation history (your units)</CardTitle>
            </CardHeader>
            <CardContent>
              {status.msg ? (
                <div
                  className={`mb-3 text-sm ${status.ok ? 'text-emerald-700' : 'text-red-600'}`}
                >
                  {status.msg}
                </div>
              ) : null}

              {!ownedUnits.length ? (
                <div className="text-sm text-muted-foreground">
                  You don’t own any units in this building.
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                    <div className="col-span-3">Email</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">Unit</div>
                    <div className="col-span-1">Expires</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  <ScrollArea className="h-[520px]">
                    {loading ? (
                      <div className="px-3 py-6 text-sm text-muted-foreground">
                        Loading…
                      </div>
                    ) : invites.length ? (
                      <div className="divide-y">
                        {invites.map((i) => (
                          <div
                            key={i.id}
                            className="grid grid-cols-12 gap-2 items-center px-3 py-2"
                          >
                            <div className="col-span-3 truncate">{i.email}</div>
                            <div className="col-span-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-muted">
                                {i.role}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-muted">
                                {i.status}
                              </span>
                            </div>
                            <div className="col-span-3">
                              {i.unit_id ? (unitsById[i.unit_id] ?? '—') : '—'}
                            </div>
                            <div className="col-span-1 text-xs">
                              {i.expires_at
                                ? new Date(i.expires_at).toLocaleDateString()
                                : '—'}
                            </div>
                            <div className="col-span-1 flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resend(i)}
                                title="Resend (rotate token)"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancel(i.id)}
                                disabled={i.status !== 'pending'}
                                title={
                                  i.status !== 'pending'
                                    ? 'Only pending invites can be cancelled'
                                    : 'Cancel'
                                }
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-6 text-sm text-muted-foreground">
                        No invites found.
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
