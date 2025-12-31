'use client';

import React, { useMemo, useState } from 'react';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

function normalizeEmail(val) {
  return (val || '').trim().toLowerCase();
}

export default function OwnerInviteForm({
  supabase,
  session,
  buildingId,
  unitId,
  onSuccess,
  onError,
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tenant'); // owners can invite tenant or owner
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const canSubmit = useMemo(() => {
    const e = normalizeEmail(email);
    if (!e) return false;
    if (!e.includes('@')) return false;
    if (!buildingId || !unitId) return false;
    if (!['tenant', 'owner'].includes(role)) return false;
    return true;
  }, [email, buildingId, unitId, role]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);

    try {
      const eNorm = normalizeEmail(email);
      if (!eNorm) throw new Error('Enter an email.');
      if (!buildingId || !unitId) throw new Error('Missing building/unit.');
      if (!session?.user?.id) throw new Error('Not signed in.');
      if (!['tenant', 'owner'].includes(role)) throw new Error('Invalid role.');

      // Create invitation row
      // NOTE: this assumes your invitations table has these columns (as used in manager page):
      // email, role, building_id, unit_id, token/status/sent_at/expires_at handled by DB defaults/triggers or edge function.
      const { data: inv, error: insErr } = await supabase
        .from('invitations')
        .insert({
          email: eNorm,
          role,
          building_id: buildingId,
          unit_id: unitId,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insErr) throw insErr;

      // Send email via edge function (same as manager flow)
      const { error: fnErr } = await supabase.functions.invoke(
        'send-invite-email',
        {
          body: { invitation_id: inv.id },
        }
      );

      if (fnErr) {
        // Invite created but email failed—still useful to keep the invite pending
        console.error('send-invite-email failed:', fnErr);
        throw new Error('Invite created, but failed to send email.');
      }

      setEmail('');
      setRole('tenant');
      onSuccess?.();
    } catch (err) {
      const msg = err?.message || 'Failed to send invite.';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite_email">Invitee email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="invite_email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            className="pl-9"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tenant">Tenant (this unit)</SelectItem>
            <SelectItem value="owner">Owner (this unit)</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          Owners can invite tenants or other owners, but only for their own
          unit.
        </div>
      </div>

      {localError ? (
        <div className="text-sm text-red-600">{localError}</div>
      ) : null}

      <Button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? 'Sending…' : 'Send invite'}
      </Button>
    </form>
  );
}
