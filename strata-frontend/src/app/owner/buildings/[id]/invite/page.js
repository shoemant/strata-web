'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import Link from 'next/link';

export default function OwnerInvitePage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const params = useParams();

  const buildingId = params?.id;

  const [ownedUnits, setOwnedUnits] = useState([]);
  const [buildingName, setBuildingName] = useState(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tenant'); // owner can invite owner/tenant
  const [unitId, setUnitId] = useState('none');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });

  useEffect(() => {
    if (!session?.user?.id || !buildingId) return;

    (async () => {
      // Building label
      const { data: b } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', buildingId)
        .maybeSingle();
      setBuildingName(b?.name ?? null);

      // Owned units in this building
      const { data, error } = await supabase
        .from('unit_memberships')
        .select(
          `
          id, role, unit_id,
          units!unit_memberships_unit_id_fkey(id,label,building_id)
        `
        )
        .eq('user_id', session.user.id)
        .eq('role', 'owner');

      if (error) {
        console.error('Failed to load owned units:', error);
        setOwnedUnits([]);
        return;
      }

      const filtered = (data || [])
        .filter((r) => r.units?.building_id === buildingId)
        .map((r) => ({ id: r.units.id, label: r.units.label }));

      setOwnedUnits(filtered);
      setUnitId(filtered?.[0]?.id ?? 'none');
    })();
  }, [session, buildingId, supabase]);

  const unitRequired = true; // for owner invites, always target a unit they own

  function isValidEmail(v) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  }

  async function handleSend(e) {
    e.preventDefault();
    setStatus({ ok: null, msg: '' });

    const e2 = email.trim().toLowerCase();
    if (!e2 || !isValidEmail(e2)) {
      setStatus({ ok: false, msg: 'Please enter a valid email.' });
      return;
    }

    if (!['owner', 'tenant'].includes(role)) {
      setStatus({ ok: false, msg: 'Invalid role.' });
      return;
    }

    if (unitRequired && (!unitId || unitId === 'none')) {
      setStatus({ ok: false, msg: 'Select a unit you own.' });
      return;
    }

    setSending(true);
    try {
      const { data: created, error: createErr } = await supabase.rpc(
        'create_invite',
        {
          p_email: e2,
          p_role: role,
          p_building_id: buildingId,
          p_unit_id: unitId,
          p_note: null,
        }
      );

      if (createErr) {
        console.error(createErr);
        setStatus({
          ok: false,
          msg: createErr.message || 'Failed to create invite.',
        });
        return;
      }

      const row = Array.isArray(created) ? created[0] : created;
      const token = row?.token;
      const expires_at = row?.expires_at;

      if (!token) {
        setStatus({ ok: false, msg: 'Invite created but token missing.' });
        return;
      }

      const unitLabel = ownedUnits.find((u) => u.id === unitId)?.label ?? null;

      const { error: sendErr } = await supabase.functions.invoke(
        'send-invite-email',
        {
          body: {
            email: e2,
            token,
            role,
            building_id: buildingId,
            building_label: buildingName || buildingId,
            unit_id: unitId,
            unit_label: unitLabel,
            expires_at,
          },
        }
      );

      if (sendErr) {
        console.warn('Email send failed:', sendErr);
        setStatus({
          ok: false,
          msg: 'Invite created, but email failed to send.',
        });
        return;
      }

      setStatus({ ok: true, msg: 'Invitation sent.' });
      setEmail('');
    } finally {
      setSending(false);
    }
  }

  if (!session) return <div className="p-6">Loading…</div>;

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0 bg-background p-6">
        <div className="max-w-3xl space-y-6 mt-10 sm:mt-8">
          <div className="flex items-center justify-between">
            <Link href={`/owner/buildings/${buildingId}/invitations`}>
              <Button variant="outline">Invitation history</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invite to your unit</CardTitle>
            </CardHeader>
            <CardContent>
              {ownedUnits.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  You don’t have any owner units in this building, so you can’t
                  send invites here.
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={role} onValueChange={(v) => setRole(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant">Tenant</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Unit (you own)</Label>
                      <Select
                        value={unitId}
                        onValueChange={(v) => setUnitId(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {ownedUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" disabled={sending}>
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending…' : 'Send Invite'}
                  </Button>

                  {status.ok === true && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      {status.msg}
                    </div>
                  )}
                  {status.ok === false && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {status.msg}
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
