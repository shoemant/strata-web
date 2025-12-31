'use client';

import React, { useEffect, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, RotateCcw, Users, XCircle } from 'lucide-react';

import OwnerInviteForm from '@/components/owner/invitations/OwnerInviteForm';

export default function OwnerInviteHubPage() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [buildingId, setBuildingId] = useState(null);
  const [unitId, setUnitId] = useState(null);

  const [building, setBuilding] = useState(null);
  const [unit, setUnit] = useState(null);

  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [pageStatus, setPageStatus] = useState({ ok: null, msg: '' });

  // Resolve building + unit from user_profiles
  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    (async () => {
      setPageStatus({ ok: null, msg: '' });

      const { data: up, error } = await supabase
        .from('user_profiles')
        .select('building_id, unit_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error || !up?.building_id || !up?.unit_id) {
        if (!cancelled) {
          setPageStatus({
            ok: false,
            msg: 'Your account is not linked to a building and unit.',
          });
        }
        return;
      }

      setBuildingId(up.building_id);
      setUnitId(up.unit_id);

      const [{ data: b }, { data: u }] = await Promise.all([
        supabase
          .from('buildings')
          .select('id, name')
          .eq('id', up.building_id)
          .maybeSingle(),
        supabase
          .from('units')
          .select('id, label, unit_number')
          .eq('id', up.unit_id)
          .maybeSingle(),
      ]);

      if (!cancelled) {
        setBuilding(b || null);
        setUnit(u || null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, supabase]);

  // Load pending invites (unit-scoped)
  useEffect(() => {
    if (!buildingId || !unitId) return;

    let cancelled = false;

    (async () => {
      setLoadingLists(true);

      const { data, error } = await supabase
        .from('invitations')
        .select('id,email,role,unit_id,status,sent_at,expires_at')
        .eq('building_id', buildingId)
        .eq('unit_id', unitId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (!cancelled) {
        setPendingInvites(data || []);
        setLoadingLists(false);
      }

      if (error) console.error(error);
    })();

    return () => {
      cancelled = true;
    };
  }, [buildingId, unitId, supabase]);

  async function refreshInvites() {
    const { data } = await supabase
      .from('invitations')
      .select('id,email,role,unit_id,status,sent_at,expires_at')
      .eq('building_id', buildingId)
      .eq('unit_id', unitId)
      .eq('status', 'pending')
      .order('sent_at', { ascending: false });

    setPendingInvites(data || []);
  }

  async function handleResend(invId) {
    setPageStatus({ ok: null, msg: '' });

    const { error } = await supabase.functions.invoke('send-invite-email', {
      body: { invitation_id: invId },
    });

    if (error) {
      setPageStatus({ ok: false, msg: 'Failed to resend invite.' });
    } else {
      setPageStatus({ ok: true, msg: 'Invite resent.' });
    }
  }

  async function handleCancel(invId) {
    setPageStatus({ ok: null, msg: '' });

    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invId);

    if (error) {
      setPageStatus({ ok: false, msg: 'Failed to cancel invite.' });
    } else {
      setPendingInvites((p) => p.filter((i) => i.id !== invId));
      setPageStatus({ ok: true, msg: 'Invite cancelled.' });
    }
  }

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      {/* Left sidebar offset */}
      <div className="absolute inset-y-0 left-16 right-0 bg-background p-6 sm:p-6 pt-20 overflow-auto">
        <div className="w-full space-y-6 mt-0 sm:mt-10">
          {pageStatus?.msg && (
            <div
              className={[
                'rounded-md border px-3 py-2 text-sm',
                pageStatus.ok ? 'border-green-500/40 text-green-700' : '',
                pageStatus.ok === false ? 'border-red-500/40 text-red-700' : '',
              ].join(' ')}
            >
              {pageStatus.msg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invite form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Invite someone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OwnerInviteForm
                  supabase={supabase}
                  session={session}
                  buildingId={buildingId}
                  unitId={unitId}
                  onSuccess={async () => {
                    setPageStatus({ ok: true, msg: 'Invite created.' });
                    await refreshInvites();
                  }}
                  onError={(msg) => setPageStatus({ ok: false, msg })}
                />
              </CardContent>
            </Card>

            {/* Help card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>You can invite:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>
                    <strong>Owners</strong> to your unit
                  </li>
                  <li>
                    <strong>Tenants</strong> to your unit
                  </li>
                </ul>
                <p>Invites are restricted to your unit only.</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending invites */}
          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                  <div className="col-span-5">Email</div>
                  <div className="col-span-3">Role</div>
                  <div className="hidden sm:block sm:col-span-2">Unit</div>
                  <div className="col-span-4 sm:col-span-2 text-right">
                    Actions
                  </div>
                </div>

                <ScrollArea className="h-[320px]">
                  {loadingLists ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                      Loading…
                    </div>
                  ) : pendingInvites.length ? (
                    <div className="divide-y">
                      {pendingInvites.map((i) => (
                        <div
                          key={i.id}
                          className="grid grid-cols-12 gap-2 items-center px-3 py-2"
                        >
                          <div className="col-span-5 truncate">{i.email}</div>

                          <div className="col-span-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-muted">
                              {i.role}
                            </span>
                          </div>

                          <div className="hidden sm:block sm:col-span-2">
                            {unit?.label || '—'}
                          </div>

                          <div className="col-span-4 sm:col-span-2 flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResend(i.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancel(i.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                      No pending invites.
                    </div>
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
