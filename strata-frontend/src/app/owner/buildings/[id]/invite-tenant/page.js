'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import { Mail, Users, RotateCcw, XCircle, ArrowLeft } from 'lucide-react';

export default function OwnerInviteTenantPage() {
    const supabase = useSupabaseClient();
    const session = useSession();
    const params = useParams();
    const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    // Units limited to the owner’s current membership(s) in this building
    const [units, setUnits] = useState([]);           // [{id,label,floor}]
    const [loadingUnits, setLoadingUnits] = useState(false);

    // form state
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('tenant');       // 'tenant' | 'owner'
    const [unitId, setUnitId] = useState('none');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState({ ok: null, msg: '' });

    // pending invites (created by this owner for this building)
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loadingInvites, setLoadingInvites] = useState(true);

    useEffect(() => {
        if (!buildingId || !session?.user?.id) return;

        (async () => {
            setLoadingUnits(true);

            const { data, error } = await supabase
                .from('unit_memberships')
                .select(`
        role,
        units:units!unit_memberships_unit_id_fkey(id, label, floor, building_id)
      `)
                .eq('user_id', session.user.id)
                .eq('role', 'owner'); // only owners

            if (error) {
                console.error('Error fetching owner unit:', error);
                setUnits([]);
                setUnitId('none');
            } else {
                const ownedUnits = (data || [])
                    .map((m) => m.units)
                    .filter((u) => u?.building_id === buildingId); // ensure same building

                setUnits(ownedUnits);
                setUnitId(ownedUnits.length ? ownedUnits[0].id : 'none');
            }

            setLoadingUnits(false);
        })();
    }, [buildingId, session?.user?.id, supabase]);


    // load *owner's* pending invites for this building
    async function refreshPending() {
        if (!buildingId || !session?.user?.id) return;
        setLoadingInvites(true);
        const { data, error } = await supabase
            .from('invitations')
            .select('id,email,role,unit_id,status,sent_at,expires_at')
            .eq('building_id', buildingId)
            .eq('invited_by', session.user.id)
            .eq('status', 'pending')
            .order('sent_at', { ascending: false });

        if (error) {
            console.error('Error loading invites:', error);
            setPendingInvites([]);
        } else {
            setPendingInvites(data || []);
        }
        setLoadingInvites(false);
    }

    useEffect(() => {
        refreshPending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildingId, session?.user?.id]);

    // For this flow, unit is always required (owner inviting owners/tenants to *their* unit)
    const unitRequired = true;

    async function handleSendInvite(e) {
        e.preventDefault();
        setStatus({ ok: null, msg: '' });

        if (!buildingId) {
            setStatus({ ok: false, msg: 'Missing building id in URL.' });
            return;
        }
        const emailTrim = email.trim().toLowerCase();
        if (!emailTrim || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrim)) {
            setStatus({ ok: false, msg: 'Please enter a valid email.' });
            return;
        }
        if (unitRequired && (unitId === 'none' || !unitId)) {
            setStatus({ ok: false, msg: 'Your unit could not be determined.' });
            return;
        }

        setSending(true);
        try {
            const token = `${(crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
                }-${Math.random().toString(36).slice(2, 10)}`;
            const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

            const { data: ins, error: insErr } = await supabase
                .from('invitations')
                .insert({
                    email: emailTrim,
                    role, // 'owner' | 'tenant'
                    building_id: buildingId,
                    unit_id: unitId, // locked to owner’s unit
                    token,
                    invited_by: session?.user?.id ?? null,
                    status: 'pending',
                    expires_at: expiresAt,
                })
                .select('id')
                .single();

            if (insErr) {
                const msg =
                    insErr.code === '23505'
                        ? 'There is already a pending invite for this email.'
                        : 'Failed to create invitation.';
                setStatus({ ok: false, msg });
                return;
            }

            // fire the email
            const { error: sendErr } = await supabase.functions.invoke('send-invite-email', {
                body: { invitation_id: ins?.id },
            });
            if (sendErr) {
                console.warn('send-invite-email failed (invite created anyway):', sendErr);
            }

            setStatus({ ok: true, msg: 'Invitation sent.' });
            setEmail('');
            await refreshPending();
        } finally {
            setSending(false);
        }
    }

    async function handleResend(invId) {
        setStatus({ ok: null, msg: '' });
        const { error } = await supabase.functions.invoke('send-invite-email', { body: { invitation_id: invId } });
        if (error) {
            console.error('Resend failed:', error);
            setStatus({ ok: false, msg: 'Failed to resend email.' });
        } else {
            setStatus({ ok: true, msg: 'Invite email resent.' });
        }
    }

    async function handleCancel(invId) {
        setStatus({ ok: null, msg: '' });
        const { error } = await supabase.from('invitations').update({ status: 'cancelled' }).eq('id', invId);
        if (error) {
            console.error('Cancel failed:', error);
            setStatus({ ok: false, msg: 'Failed to cancel invite.' });
        } else {
            setPendingInvites((prev) => prev.filter((p) => p.id !== invId));
            setStatus({ ok: true, msg: 'Invite cancelled.' });
        }
    }

    if (!session) return <p className="p-6">Loading…</p>;

    const noUnit = !loadingUnits && units.length === 0;

    return (
        <ProtectedRoute allowedRoles={['owner']}>
            <div className="absolute inset-y-0 left-16 right-0 bg-background p-6">
                <div className="max-w-3xl space-y-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Invite People</h1>
                        <Link href={`/owner/buildings/${buildingId}/dashboard`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                        </Link>
                    </div>

                    {/* Invite form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" /> Send an Invite
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {noUnit ? (
                                <div className="text-sm text-muted-foreground">
                                    We couldn’t find an active unit for your account in this building. Please contact your manager to link
                                    your unit before sending invites.
                                </div>
                            ) : (
                                <form onSubmit={handleSendInvite} className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={noUnit}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Role</Label>
                                        <Select value={role} onValueChange={(v) => setRole(v)} disabled={noUnit}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tenant">Tenant</SelectItem>
                                                <SelectItem value="owner">Owner</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Unit</Label>
                                        <Select
                                            value={unitId}
                                            onValueChange={(v) => setUnitId(v)}
                                            disabled={loadingUnits || noUnit}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={loadingUnits ? 'Loading units…' : 'Select your unit'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {units.map((u) => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.label}{u.floor != null ? ` (Floor ${u.floor})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            You can only invite people to the unit you currently occupy/own.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button type="submit" disabled={sending || noUnit || !buildingId}>
                                            {sending ? 'Sending…' : 'Send Invite'}
                                        </Button>
                                        {status.ok === true && (
                                            <span className="text-sm text-green-600">{status.msg}</span>
                                        )}
                                        {status.ok === false && (
                                            <span className="text-sm text-red-600">{status.msg}</span>
                                        )}
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending invites created by this owner for this building */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" /> Pending invites
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground border-b">
                                    <div className="col-span-5">Email</div>
                                    <div className="col-span-2">Role</div>
                                    <div className="col-span-3">Unit</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>

                                <ScrollArea className="h-[320px]">
                                    {loadingInvites ? (
                                        <div className="px-3 py-6 text-sm text-muted-foreground">Loading…</div>
                                    ) : pendingInvites.length ? (
                                        <div className="divide-y">
                                            {pendingInvites.map((inv) => {
                                                const unitLabel = units.find((u) => u.id === inv.unit_id)?.label ?? '—';
                                                return (
                                                    <div key={inv.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                                                        <div className="col-span-5 truncate">{inv.email}</div>
                                                        <div className="col-span-2">
                                                            <Badge variant="outline" className="capitalize">{inv.role}</Badge>
                                                        </div>
                                                        <div className="col-span-3">{unitLabel}</div>
                                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleResend(inv.id)}
                                                                title="Resend email"
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" /> Resend
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCancel(inv.id)}
                                                                title="Cancel invite"
                                                            >
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
                </div>
            </div>
        </ProtectedRoute>
    );
}
