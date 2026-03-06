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
import { sendInviteEmail } from '@/app/login/lib/authActions';

export default function InviteForm({
  supabase,
  session,
  buildingId: initialBuildingId,
  buildings = [],
  actorRole = 'manager',
  unitOptionsOverride = null,
  lockBuilding = false,
  onSuccess,
  onError,
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('tenant');
  const [inviteUnitId, setInviteUnitId] = useState('none');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });

  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const multiBuilding = (buildings?.length || 0) > 1 && !lockBuilding;

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const allowedRoles = useMemo(() => {
    if (actorRole === 'owner') {
      return ['tenant', 'owner'];
    }
    return ['tenant', 'owner', 'manager'];
  }, [actorRole]);

  useEffect(() => {
    const preferred =
      (initialBuildingId &&
        buildings.find((b) => b.id === initialBuildingId)?.id) ||
      buildings[0]?.id ||
      (initialBuildingId ? initialBuildingId : null);

    setSelectedBuildingId(preferred || null);
  }, [buildings, initialBuildingId]);

  useEffect(() => {
    (async () => {
      if (!selectedBuildingId) {
        setUnits([]);
        setInviteUnitId('none');
        return;
      }

      if (unitOptionsOverride) {
        setUnits(unitOptionsOverride);
        setInviteUnitId((prev) => {
          if (
            prev !== 'none' &&
            unitOptionsOverride.some((u) => u.id === prev)
          ) {
            return prev;
          }
          return unitOptionsOverride[0]?.id ?? 'none';
        });
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
  }, [selectedBuildingId, supabase, unitOptionsOverride]);

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

    if (!allowedRoles.includes(inviteRole)) {
      const msg = 'You are not allowed to send that type of invite.';
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

    if (actorRole === 'owner' && inviteRole === 'manager') {
      const msg = 'Owners cannot invite managers.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }

    setSendingInvite(true);

    try {
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

      const unitLabel =
        unitRequired && inviteUnitId !== 'none'
          ? (units.find((u) => u.id === inviteUnitId)?.label ?? null)
          : null;

      await sendInviteEmail({
        email,
        role: inviteRole,
        building_label: selectedBuildingObj
          ? buildingLabel(selectedBuildingObj)
          : selectedBuildingId,
        unit_label: unitLabel,
        token,
        expires_at: expiresAt,
      });

      const msg = 'Invitation created and email sent.';
      setStatus({ ok: true, msg });
      setInviteEmail('');
      setInviteUnitId(unitOptionsOverride?.[0]?.id ?? 'none');
      onSuccess?.(msg);
    } catch (err) {
      const msg = err.message || 'Failed to create and send invite.';
      setStatus({ ok: false, msg });
      onError?.(msg);
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
              {allowedRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
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
              {inviteRole !== 'manager' ? null : (
                <SelectItem value="none">— No unit —</SelectItem>
              )}
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
  actorRole: PropTypes.oneOf(['manager', 'owner']),
  unitOptionsOverride: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string,
      floor: PropTypes.number,
    })
  ),
  lockBuilding: PropTypes.bool,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};
