'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const DEFAULT_FLAGS = {
    owner_documents: true,
    owner_announcements: true,
    owner_maintenance: true,
    owner_resources: true,
    tenant_documents: true,
    tenant_announcements: true,
    tenant_maintenance: true,
    tenant_resources: true,
};

const FEATURE_LIST = [
    { key: 'documents', label: 'Documents' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'maintenance', label: 'Maintenance Requests' },
    { key: 'resources', label: 'Resources (Bookings)' },
];

// Pull only known keys from a row, defaulting to DEFAULT_FLAGS
const pickFlags = (row) => {
    const picked = {};
    for (const k of Object.keys(DEFAULT_FLAGS)) {
        picked[k] = typeof row?.[k] === 'boolean' ? row[k] : DEFAULT_FLAGS[k];
    }
    return picked;
};

export default function BuildingFeaturesPage() {
    const rawParams = useParams();
    const buildingId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || null;
    const searchParams = useSearchParams();

    const forceDebug = searchParams?.has('debug'); // add ?debug=1 to the URL to force banner
    const inDev = process.env.NODE_ENV === 'development';
    const showDebug = inDev || forceDebug;

    const supabase = useSupabaseClient();
    const session = useSession();

    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveOk, setSaveOk] = useState(false);
    const [building, setBuilding] = useState(null);
    const [flags, setFlags] = useState(DEFAULT_FLAGS);

    const canSave = useMemo(() => !!building && !!session?.user?.id, [building, session?.user?.id]);

    // 🔎 Render-time logs so you see something even if the effect never runs
    /* eslint-disable no-console */
    console.log('[features/render]', {
        buildingId,
        hasSession: !!session,
        sessionUser: session?.user?.id || null,
    });
    /* eslint-enable no-console */

    // Watchdog: after 1s, tell us which guard is blocking
    const [watchdog, setWatchdog] = useState('');
    useEffect(() => {
        const t = setTimeout(() => {
            if (!buildingId) setWatchdog('waiting for buildingId from route');
            else if (!session) setWatchdog('waiting for session (is SessionContextProvider wrapping app?)');
        }, 1000);
        return () => clearTimeout(t);
    }, [buildingId, session]);

    useEffect(() => {
        if (!buildingId || !session) {
            console.log('[features/effect skipped] missing deps', { buildingId, hasSession: !!session });
            return;
        }

        (async () => {
            setLoading(true);
            setAuthError('');
            setSaveError('');
            setSaveOk(false);
            setBuilding(null);

            try {
                console.log('[features/load] start', { buildingId, user: session.user.id });

                // Verify this user manages the building (explicit FK syntax)
                const { data: mb, error: mbErr } = await supabase
                    .from('manager_buildings')
                    .select('building_id, buildings!manager_buildings_building_id_fkey(id, name)')
                    .eq('user_id', session.user.id)
                    .eq('building_id', buildingId)
                    .single();
                console.log('[features/manager_buildings]', { mb, mbErr });

                if (mbErr || !mb) {
                    // Fallback: try to read the building name so UI still renders nicely
                    const { data: bData, error: bErr } = await supabase
                        .from('buildings')
                        .select('id, name')
                        .eq('id', buildingId)
                        .single();
                    console.log('[features/buildings fallback]', { bData, bErr });

                    if (bErr || !bData) {
                        setAuthError('You do not manage this building or it was not found.');
                        return;
                    }
                    setBuilding(bData);
                } else {
                    setBuilding(mb.buildings || { id: buildingId, name: 'Building' });
                }

                // Load feature flags row (may not exist yet)
                const { data: features, error: featErr } = await supabase
                    .from('building_features')
                    .select('*')
                    .eq('building_id', buildingId)
                    .maybeSingle();
                console.log('[features/building_features]', { features, featErr });

                if (featErr) {
                    setFlags(DEFAULT_FLAGS);
                } else if (features) {
                    setFlags({ ...DEFAULT_FLAGS, ...pickFlags(features) });
                } else {
                    setFlags(DEFAULT_FLAGS);
                }
            } catch (e) {
                console.error('[features/unexpected]', e);
                setAuthError('Something went wrong while loading settings.');
            } finally {
                setLoading(false);
            }
        })();
    }, [buildingId, session, supabase]);

    const setRoleFeature = (role, key, value) => {
        setFlags((prev) => ({ ...prev, [`${role}_${key}`]: value }));
    };

    const save = async () => {
        setSaveError('');
        setSaveOk(false);
        if (!canSave) return;

        const payload = {
            building_id: buildingId,
            ...flags,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('building_features')
            .upsert(payload, { onConflict: 'building_id' });

        if (error) {
            console.error('[features/save error]', error);
            setSaveError('Failed to save settings.');
        } else {
            setSaveOk(true);
        }
    };

    const resetDefaults = () => {
        setFlags(DEFAULT_FLAGS);
        setSaveOk(false);
    };

    // If params aren’t ready yet, still show the debug banner
    if (!buildingId) {
        return (
            <div className="p-6 space-y-4">
                {showDebug && (
                    <div className="p-3 text-xs rounded bg-yellow-100 text-yellow-900">
                        Waiting for buildingId from route…
                    </div>
                )}
                <div>Loading…</div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6 space-y-4">
                {showDebug && (
                    <div className="p-3 text-xs rounded bg-yellow-100 text-yellow-900">
                        Waiting for session (is SessionContextProvider wrapping the app?)…
                    </div>
                )}
                <div>Loading session…</div>
            </div>
        );
    }

    // Soft auth gate
    if (!loading && authError) {
        return (
            <div className="p-6 max-w-xl mx-auto space-y-4">
                {showDebug && (
                    <div className="p-3 text-xs rounded bg-yellow-100 text-yellow-900">
                        authError: {authError}
                    </div>
                )}
                <Alert variant="destructive">
                    <AlertTitle>Access denied</AlertTitle>
                    <AlertDescription>{authError}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles={['manager']}>
            <div className="absolute inset-y-0 left-16 right-0 bg-background p-6 space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Feature Access</h1>
                    <Badge variant="secondary">{building?.name || '—'}</Badge>
                </div>

                {/* Debug banner (dev or ?debug=1) */}
                {showDebug && (
                    <div className="p-3 mb-4 text-xs rounded bg-yellow-100 text-yellow-900 space-y-1">
                        <div><strong>Debug Info</strong></div>
                        <div>buildingId: {String(buildingId)}</div>
                        <div>session user id: {session?.user?.id || '—'}</div>
                        <div>watchdog: {watchdog || '—'}</div>
                        <div>loading: {String(loading)}</div>
                        <div>authError: {authError || '—'}</div>
                        <div>saveError: {saveError || '—'}</div>
                        <div>building: {building ? JSON.stringify(building) : '—'}</div>
                    </div>
                )}

                {saveError && (
                    <Alert variant="destructive">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{saveError}</AlertDescription>
                    </Alert>
                )}
                {saveOk && (
                    <Alert>
                        <AlertTitle>Saved</AlertTitle>
                        <AlertDescription>Feature visibility updated.</AlertDescription>
                    </Alert>
                )}

                <Card>
                    {loading ? (
                        <CardContent className="p-6">Loading…</CardContent>
                    ) : (
                        <>
                            <CardHeader>
                                <CardTitle>Choose which tabs are visible</CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6 space-y-8">
                                {/* Owner toggles */}
                                <div>
                                    <h2 className="text-lg font-semibold mb-4">Owners</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {FEATURE_LIST.map((f) => (
                                            <FeatureToggle
                                                key={`owner_${f.key}`}
                                                id={`owner_${f.key}`}
                                                label={f.label}
                                                checked={flags[`owner_${f.key}`]}
                                                onCheckedChange={(v) => setRoleFeature('owner', f.key, v)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Tenant toggles */}
                                <div>
                                    <h2 className="text-lg font-semibold mb-4">Tenants</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {FEATURE_LIST.map((f) => (
                                            <FeatureToggle
                                                key={`tenant_${f.key}`}
                                                id={`tenant_${f.key}`}
                                                label={f.label}
                                                checked={flags[`tenant_${f.key}`]}
                                                onCheckedChange={(v) => setRoleFeature('tenant', f.key, v)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={resetDefaults}>
                                    Reset to defaults
                                </Button>
                                <div className="space-x-2">
                                    <Link href={`/manager/buildings/${buildingId}/dashboard`}>
                                        <Button variant="ghost">Back to dashboard</Button>
                                    </Link>
                                    <Button onClick={save} disabled={!canSave}>
                                        Save Changes
                                    </Button>
                                </div>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </ProtectedRoute>
    );
}

function FeatureToggle({ id, label, checked, onCheckedChange }) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
                <Label htmlFor={id} className="font-medium">{label}</Label>
                <div className="text-xs text-muted-foreground">Visible in navigation and pages</div>
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}
