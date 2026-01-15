'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
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

export default function InviteForm({
  supabase,
  session,
  buildingId: initialBuildingId,
  buildings = [],
  onSuccess,
  onError,
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('tenant');
  const [inviteUnitId, setInviteUnitId] = useState('none');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });

  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const multiBuilding = (buildings?.length || 0) > 1;

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    const preferred =
      (initialBuildingId &&
        buildings.find((b) => b.id === initialBuildingId)?.id) ||
      buildings[0]?.id ||
      (initialBuildingId ? initialBuildingId : null);

    setSelectedBuildingId(preferred || null);
  }, [multiBuilding, buildings, initialBuildingId]);

  useEffect(() => {
    (async () => {
      if (!selectedBuildingId) {
        setUnits([]);
        setInviteUnitId('none');
        return;
      }
      setLoadingUnits(true);

      const { data, error } = await supabase
        .from('units')
        .select('id,label,floor')
        .eq('building_id', selectedBuildingId)
        .order('floor', { ascending: true });

      if (error) {
        console.error('Error loading units:', error);
        setUnits([]);
        setInviteUnitId('none');
      } else {
        setUnits(data || []);
        setInviteUnitId((prev) =>
          prev !== 'none' && !(data || []).some((u) => u.id === prev)
            ? 'none'
            : prev
        );
      }
      setLoadingUnits(false);
    })();
  }, [selectedBuildingId, supabase]);

  const unitRequired = inviteRole === 'tenant' || inviteRole === 'owner';

  const buildingLabel = (b) => b?.name || b?.address || b?.id || 'Building';
  const selectedBuildingObj = buildings.find(
    (b) => b.id === selectedBuildingId
  );

  function isValidEmail(v) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  }

  async function handleSendInvite(e) {
    e.preventDefault();
    setStatus({ ok: null, msg: '' });

    if (!selectedBuildingId) {
      const msg = 'Please select a building.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      const msg = 'Please enter a valid email.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }

    if (unitRequired && (!inviteUnitId || inviteUnitId === 'none')) {
      const msg = 'Select a unit for owners/tenants.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }

    setSendingInvite(true);
    try {
      // 1) Create/rotate invite in DB via RPC
      const { data: created, error: createErr } = await supabase.rpc(
        'create_invite',
        {
          p_email: email,
          p_role: inviteRole,
          p_building_id: selectedBuildingId,
          p_unit_id: unitRequired ? inviteUnitId : null,
          p_note: null,
        }
      );

      if (createErr) {
        console.error('create_invite error:', createErr);
        const msg = createErr.message || 'Failed to create invitation.';
        setStatus({ ok: false, msg });
        onError?.(msg);
        return;
      }

      const row = Array.isArray(created) ? created[0] : created;
      const expiresAt = row?.expires_at ?? null;
      const token = row?.token;

      if (!token) {
        const msg = 'Invite created, but token was not returned.';
        setStatus({ ok: false, msg });
        onError?.(msg);
        return;
      }

      // 2) Send email (Edge Function / backend)
      const unitLabel =
        unitRequired && inviteUnitId !== 'none'
          ? (units.find((u) => u.id === inviteUnitId)?.label ?? null)
          : null;

      const { error: sendErr } = await supabase.functions.invoke(
        'send-invite-email',
        {
          body: {
            email,
            role: inviteRole,
            building_id: selectedBuildingId,
            building_label: selectedBuildingObj
              ? buildingLabel(selectedBuildingObj)
              : selectedBuildingId,
            unit_id: unitRequired ? inviteUnitId : null,
            unit_label: unitLabel,
            token,
            expires_at: expiresAt,
          },
        }
      );

      if (sendErr) {
        console.warn(
          'send-invite-email failed (invite created anyway):',
          sendErr
        );
      }

      const msg = 'Invitation created.';
      setStatus({ ok: true, msg });
      setInviteEmail('');
      setInviteUnitId('none');
      onSuccess?.(msg);
    } finally {
      setSendingInvite(false);
    }
  }

  return (
    <form onSubmit={handleSendInvite} className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label>Building</Label>
          {multiBuilding ? (
            <Select
              value={selectedBuildingId ?? undefined}
              onValueChange={(v) => setSelectedBuildingId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {buildingLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              readOnly
              value={
                selectedBuildingObj
                  ? buildingLabel(selectedBuildingObj)
                  : 'No building assigned'
              }
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="inviteEmail">Email</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Unit{' '}
            {unitRequired ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground">(not required)</span>
            )}
          </Label>
          <Select
            value={inviteUnitId}
            onValueChange={(v) => setInviteUnitId(v)}
            disabled={
              !selectedBuildingId ||
              loadingUnits ||
              !units?.length ||
              inviteRole === 'manager'
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={loadingUnits ? 'Loading units…' : 'Select a unit'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No unit —</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                  {u.floor != null ? ` (Floor ${u.floor})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!selectedBuildingId || sendingInvite}>
          <Send className="mr-2 h-4 w-4" />
          {sendingInvite ? 'Sending…' : 'Send Invite'}
        </Button>

        {status.ok === true && (
          <span className="inline-flex items-center text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {status.msg}
          </span>
        )}
        {status.ok === false && (
          <span className="inline-flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {status.msg}
          </span>
        )}
      </div>
    </form>
  );
}

InviteForm.propTypes = {
  supabase: PropTypes.object.isRequired,
  session: PropTypes.object,
  buildingId: PropTypes.string,
  buildings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      address: PropTypes.string,
    })
  ),
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};
