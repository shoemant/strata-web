'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // NEW

export default function ElevatorBookingForm({
    supabase,
    buildingId,
    currentProfile, // { role, unit_id, building_id }
}) {
    const [profile, setProfile] = useState(currentProfile ?? null);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // form state
    const [resourceId, setResourceId] = useState('');
    const [purpose, setPurpose] = useState('move_in');
    const [date, setDate] = useState(() => new Date());
    const [time, setTime] = useState('09:00');
    const [targetEmail, setTargetEmail] = useState('');
    const [targetRole, setTargetRole] = useState('tenant'); // owner|tenant
    const [targetUnitId, setTargetUnitId] = useState('');

    // NEW: state for manager lookups
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [resolvedUnits, setResolvedUnits] = useState([]); // [{unit_id, unit_label, membership_role}]

    // Load profile & elevator resources
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                let up = currentProfile;
                if (!up) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not signed in');
                    const { data: upRow } = await supabase
                        .from('user_profiles')
                        .select('role, building_id, unit_id')
                        .eq('id', user.id)
                        .maybeSingle();
                    up = upRow;
                }
                setProfile(up);

                // find Elevator type id
                const { data: rts } = await supabase
                    .from('resource_types')
                    .select('id')
                    .eq('name', 'Elevator')
                    .maybeSingle();

                const elevatorTypeId = rts?.id || null;

                const { data: rs } = await supabase
                    .from('resources')
                    .select('id, name, total_spots, available_start, available_end, booking_interval_minutes')
                    .eq('building_id', buildingId)
                    .eq('type_id', elevatorTypeId)
                    .eq('is_active', true)
                    .order('name');

                const list = rs ?? [];
                setResources(list);
                if (list.length && !resourceId) setResourceId(list[0].id);

                // default unit for owners/tenants
                if (up?.unit_id) setTargetUnitId(up.unit_id);
            } catch (e) {
                setErr(e.message);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildingId]);

    const role = profile?.role;

    // UI gating by role
    const canChooseTargetEmail = role === 'manager' || role === 'owner';
    const canChooseTargetRole = role === 'manager' || role === 'owner';

    // Derived: selected resource + time slots
    const selectedResource = useMemo(
        () => resources.find(r => r.id === resourceId),
        [resources, resourceId]
    );

    const slots = useMemo(() => {
        if (!selectedResource) return [];
        const start = selectedResource.available_start; // '08:00:00'
        const end = selectedResource.available_end;
        const step = selectedResource.booking_interval_minutes;
        const toMin = (t) => {
            const [H, M] = t.split(':');
            return parseInt(H, 10) * 60 + parseInt(M, 10);
        };
        let s = toMin(start);
        const e = toMin(end);
        const arr = [];
        while (s + step <= e) {
            const h = String(Math.floor(s / 60)).padStart(2, '0');
            const m = String(s % 60).padStart(2, '0');
            arr.push(`${h}:${m}`);
            s += step;
        }
        return arr;
    }, [selectedResource]);

    // NEW: when MANAGER is booking a MOVE OUT and a valid email is entered, resolve that user's units in this building
    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!(role === 'manager' && purpose === 'move_out')) {
                setResolvedUnits([]);
                return;
            }
            if (!emailRe.test(targetEmail)) {
                setResolvedUnits([]);
                setTargetUnitId('');
                return;
            }
            setUnitsLoading(true);
            const { data, error } = await supabase.rpc('units_for_email_in_building', {
                p_email: targetEmail.trim().toLowerCase(),
                p_building_id: buildingId,
            });
            setUnitsLoading(false);
            if (cancelled) return;

            if (error) {
                setErr(error.message);
                setResolvedUnits([]);
                setTargetUnitId('');
                return;
            }
            const rows = data || [];
            setResolvedUnits(rows);

            if (rows.length === 1) {
                setTargetUnitId(rows[0].unit_id);       // ✅ auto-select single unit
                // Optionally align `targetRole` with membership:
                // if (rows[0].membership_role) setTargetRole(rows[0].membership_role);
            } else {
                setTargetUnitId('');                    // force a choice
            }
        }
        run();
        return () => { cancelled = true; };
    }, [role, purpose, targetEmail, buildingId, supabase]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr('');
        setOk('');
        if (!resourceId) return setErr('Choose an elevator');

        const isMoveIn = purpose === 'move_in'; // FIX
        const selectedDateString = format(date, 'yyyy-MM-dd'); // FIX
        const selectedTime = time; // FIX

        // Client-side guards (RPC re-validates)
        if (isMoveIn) {
            if (!canChooseTargetEmail) return setErr('You are not allowed to invite for move-in');
            if (!emailRe.test(targetEmail)) return setErr('Target email is required for move-in');
            if (!targetRole) return setErr('Target role is required for move-in');
            if ((role === 'owner' || targetRole !== 'manager') && !targetUnitId)
                return setErr('Unit is required for owner/tenant move-in');
        } else {
            // move_out
            if (role === 'tenant' && !targetUnitId) {
                return setErr('Your unit is not linked to your profile.');
            }
            if (role === 'owner' && !targetUnitId) {
                return setErr('Select your unit for move-out.');
            }
            if (role === 'manager') {
                if (!emailRe.test(targetEmail)) return setErr('Resident email is required for manager move-out.');
                if (!targetUnitId) return setErr('Select which unit is moving out.');
                // Optional: ensure targetRole matches at least one resolved membership
                // if (resolvedUnits.length && !resolvedUnits.some(u => u.membership_role === targetRole)) {
                //   return setErr('Selected role does not match resident membership.');
                // }
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                p_resource_id: resourceId,                         // FIX
                p_booking_date: selectedDateString,                // FIX
                p_start_time: `${selectedTime}:00`,                // FIX
                p_purpose: purpose,                                // FIX
                p_target_email: isMoveIn ? targetEmail : (role === 'manager' ? targetEmail : null),  // NEW
                p_target_role: isMoveIn ? targetRole : (role === 'manager' ? targetRole : null),  // NEW
                p_target_unit_id: targetUnitId || null,
                p_notes: null,
            };

            const { data, error } = await supabase.rpc('book_elevator_move', payload);
            if (error) {
                setErr(error.message);
                return;
            }

            // If an invite was created (move_in), trigger email now from client
            if (data?.invite_id) {
                const { error: sendErr } = await supabase.functions.invoke('send-invite-email', {
                    body: { invitation_id: data.invite_id },
                });
                if (sendErr) console.warn('send-invite-email failed', sendErr);
            }

            setOk('Booking created successfully.');
            // (optional) reset some fields
            // setTargetEmail(''); setResolvedUnits([]); ...
        } catch (e2) {
            setErr(e2.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p className="p-4">Loading…</p>;

    // Derived booleans for rendering
    const showManagerMoveOutInputs = role === 'manager' && purpose === 'move_out'; // NEW
    const showMoveInInviteFields = purpose === 'move_in';                        // clearer

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>Elevator booking</CardTitle>
            </CardHeader>
            <CardContent>
                {err && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{err}</AlertDescription>
                    </Alert>
                )}
                {ok && (
                    <Alert className="mb-4">
                        <AlertDescription>{ok}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Elevator */}
                    <div className="space-y-2">
                        <Label>Elevator</Label>
                        <Select value={resourceId} onValueChange={setResourceId}>
                            <SelectTrigger><SelectValue placeholder="Select elevator" /></SelectTrigger>
                            <SelectContent>
                                {resources.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Purpose */}
                    <div className="space-y-2">
                        <Label>Purpose</Label>
                        <Select value={purpose} onValueChange={setPurpose}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(role === 'tenant')
                                    ? <SelectItem value="move_out">Move out</SelectItem>
                                    : <>
                                        <SelectItem value="move_in">Move in</SelectItem>
                                        <SelectItem value="move_out">Move out</SelectItem>
                                    </>
                                }
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={format(date, 'yyyy-MM-dd')}
                                onChange={(e) => setDate(new Date(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Start time</Label>
                            <Select value={time} onValueChange={setTime}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {slots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* MOVE IN: invite target */}
                    {showMoveInInviteFields && (
                        <>
                            <div className="space-y-2">
                                <Label>Invitee email</Label>
                                <Input
                                    type="email"
                                    value={targetEmail}
                                    onChange={(e) => setTargetEmail(e.target.value)}
                                    disabled={!canChooseTargetEmail}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Invitee role</Label>
                                <Select value={targetRole} onValueChange={setTargetRole} disabled={!canChooseTargetRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tenant">Tenant</SelectItem>
                                        <SelectItem value="owner">Owner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {/* MANAGER MOVE OUT: lookup resident units for entered email */}
                    {showManagerMoveOutInputs && (
                        <>
                            <div className="space-y-2">
                                <Label>Resident email</Label>
                                <Input
                                    type="email"
                                    placeholder="resident@example.com"
                                    value={targetEmail}
                                    onChange={(e) => setTargetEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Resident role</Label>
                                <Select value={targetRole} onValueChange={setTargetRole}>
                                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tenant">Tenant</SelectItem>
                                        <SelectItem value="owner">Owner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {unitsLoading && (
                                <Alert className="text-sm">
                                    <AlertDescription>Looking up units…</AlertDescription>
                                </Alert>
                            )}

                            {resolvedUnits.length > 1 && !unitsLoading && (
                                <div className="space-y-2">
                                    <Label>Which unit is moving out?</Label>
                                    <Select value={targetUnitId || ''} onValueChange={setTargetUnitId}>
                                        <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                                        <SelectContent>
                                            {resolvedUnits.map(u => (
                                                <SelectItem key={u.unit_id} value={u.unit_id}>
                                                    {u.unit_label} {u.membership_role ? `(${u.membership_role})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {resolvedUnits.length === 1 && !unitsLoading && (
                                <Alert className="text-sm">
                                    <AlertDescription>
                                        Auto-selected unit: {resolvedUnits[0].unit_label} {resolvedUnits[0].membership_role ? `(${resolvedUnits[0].membership_role})` : ''}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {resolvedUnits.length === 0 && emailRe.test(targetEmail) && !unitsLoading && (
                                <Alert variant="destructive" className="text-sm">
                                    <AlertDescription>No units found for that email in this building.</AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}

                    {/* Owners/Tenants (and move_in generally) still need a unit picker if required by your rules */}
                    {((purpose === 'move_in') || (role !== 'manager' && purpose === 'move_out')) && (
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input
                                placeholder="Unit ID"
                                value={targetUnitId || ''}
                                onChange={(e) => setTargetUnitId(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Owners/tenants must select their own unit. Managers use resident lookup above.
                            </p>
                        </div>
                    )}

                    <div className="pt-2">
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Booking…' : 'Book'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
