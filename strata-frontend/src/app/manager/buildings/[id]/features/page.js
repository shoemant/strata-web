'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const FEATURES = [
  { key: 'announcements', label: 'Announcements' },
  { key: 'documents', label: 'Documents' },
  { key: 'resources', label: 'Bookings (Amenities)' },
  { key: 'polls', label: 'Polls & Votes' },
  { key: 'maintenance', label: 'Maintenance Requests' },
];

const ROLES = [
  { key: 'manager', label: 'Managers' },
  { key: 'owner', label: 'Owners' },
  { key: 'tenant', label: 'Tenants' },
];

const DEFAULT_BASE = {
  base_announcements: true,
  base_documents: true,
  base_resources: true,
  base_polls: true,
  base_maintenance: true,
};

// null = inherit base, true/false = override
const DEFAULT_OVERRIDES = {
  manager: {
    announcements: null,
    documents: null,
    resources: null,
    polls: null,
    maintenance: null,
  },
  owner: {
    announcements: null,
    documents: null,
    resources: null,
    polls: null,
    maintenance: null,
  },
  tenant: {
    announcements: null,
    documents: null,
    resources: null,
    polls: null,
    maintenance: null,
  },
};

function normalizeBoolOrNull(v) {
  if (v === true) return true;
  if (v === false) return false;
  return null;
}

function pickBase(row) {
  const base = {};
  for (const k of Object.keys(DEFAULT_BASE)) {
    base[k] = typeof row?.[k] === 'boolean' ? row[k] : DEFAULT_BASE[k];
  }
  return base;
}

function pickOverrides(row) {
  const overrides = structuredClone(DEFAULT_OVERRIDES);

  for (const role of Object.keys(DEFAULT_OVERRIDES)) {
    for (const f of FEATURES) {
      const col = `${role}_${f.key}_override`;
      overrides[role][f.key] = normalizeBoolOrNull(row?.[col]);
    }
  }

  return overrides;
}

function isFeatureEnabled(featuresRow, role, key) {
  const base = featuresRow?.[`base_${key}`] !== false; // default true
  const override = featuresRow?.[`${role}_${key}_override`]; // null | true | false
  const roleAllows =
    override === null || override === undefined ? true : override;
  return base && roleAllows;
}

export default function BuildingFeaturesPage() {
  const rawParams = useParams();
  const buildingId = Array.isArray(rawParams?.id)
    ? rawParams.id[0]
    : rawParams?.id || null;

  const searchParams = useSearchParams();
  const forceDebug = searchParams?.has('debug');
  const inDev = process.env.NODE_ENV === 'development';
  const showDebug = inDev || forceDebug;

  const supabase = useSupabaseClient();
  const session = useSession();

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  const [building, setBuilding] = useState(null);

  const [base, setBase] = useState(DEFAULT_BASE);
  const [overrides, setOverrides] = useState(DEFAULT_OVERRIDES);
  const [customizeRoles, setCustomizeRoles] = useState(false);

  // keep the raw row so you can debug / compute effective previews if needed
  const [featuresRow, setFeaturesRow] = useState(null);

  const canSave = useMemo(
    () => !!building && !!session?.user?.id && !!buildingId,
    [building, session?.user?.id, buildingId]
  );

  // Watchdog
  const [watchdog, setWatchdog] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      if (!buildingId) setWatchdog('waiting for buildingId from route');
      else if (!session)
        setWatchdog(
          'waiting for session (is SessionContextProvider wrapping app?)'
        );
    }, 1000);
    return () => clearTimeout(t);
  }, [buildingId, session]);

  useEffect(() => {
    if (!buildingId || !session) return;

    (async () => {
      setLoading(true);
      setAuthError('');
      setSaveError('');
      setSaveOk(false);
      setBuilding(null);

      try {
        // Verify manager access for this building
        const { data: mb, error: mbErr } = await supabase
          .from('manager_buildings')
          .select(
            'building_id, buildings!manager_buildings_building_id_fkey(id, name)'
          )
          .eq('user_id', session.user.id)
          .eq('building_id', buildingId)
          .single();

        if (mbErr || !mb) {
          const { data: bData, error: bErr } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('id', buildingId)
            .single();

          if (bErr || !bData) {
            setAuthError(
              'You do not manage this building or it was not found.'
            );
            return;
          }
          setBuilding(bData);
        } else {
          setBuilding(mb.buildings || { id: buildingId, name: 'Building' });
        }

        // Load features row (may not exist)
        const { data: row, error: featErr } = await supabase
          .from('building_features')
          .select('*')
          .eq('building_id', buildingId)
          .maybeSingle();

        if (featErr) {
          // fail open with defaults
          setFeaturesRow(null);
          setBase(DEFAULT_BASE);
          setOverrides(DEFAULT_OVERRIDES);
          setCustomizeRoles(false);
          return;
        }

        if (!row) {
          // no row yet
          setFeaturesRow(null);
          setBase(DEFAULT_BASE);
          setOverrides(DEFAULT_OVERRIDES);
          setCustomizeRoles(false);
          return;
        }

        setFeaturesRow(row);
        setBase(pickBase(row));
        const pickedOverrides = pickOverrides(row);
        setOverrides(pickedOverrides);

        // enable customize if any override is explicitly set
        const anyOverride = Object.keys(pickedOverrides).some((r) =>
          FEATURES.some((f) => pickedOverrides[r][f.key] !== null)
        );
        setCustomizeRoles(anyOverride);
      } catch (e) {
        console.error('[features/unexpected]', e);
        setAuthError('Something went wrong while loading settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, session, supabase]);

  const setBaseFeature = (key, value) => {
    setBase((prev) => ({ ...prev, [`base_${key}`]: value }));
    setSaveOk(false);
  };

  const setOverride = (role, key, value) => {
    setOverrides((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: value, // null | true | false
      },
    }));
    setSaveOk(false);
  };

  const clearAllOverrides = () => {
    setOverrides(DEFAULT_OVERRIDES);
    setSaveOk(false);
  };

  const resetAll = () => {
    setBase(DEFAULT_BASE);
    setOverrides(DEFAULT_OVERRIDES);
    setCustomizeRoles(false);
    setSaveOk(false);
  };

  const save = async () => {
    setSaveError('');
    setSaveOk(false);
    if (!canSave) return;

    // Flatten payload into columns
    const payload = {
      building_id: buildingId,
      ...base,
      updated_at: new Date().toISOString(),
    };

    // If not customizing roles, write all overrides as null (inherit)
    const overridesToWrite = customizeRoles ? overrides : DEFAULT_OVERRIDES;

    for (const role of Object.keys(overridesToWrite)) {
      for (const f of FEATURES) {
        payload[`${role}_${f.key}_override`] = overridesToWrite[role][f.key];
      }
    }

    const { data, error } = await supabase
      .from('building_features')
      .upsert(payload, { onConflict: 'building_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[features/save error]', error);
      setSaveError(`Failed to save settings: ${error.message}`);
      return;
    }

    setFeaturesRow(data);
    setBase(pickBase(data));
    const pickedOverrides = pickOverrides(data);
    setOverrides(pickedOverrides);

    const anyOverride = Object.keys(pickedOverrides).some((r) =>
      FEATURES.some((f) => pickedOverrides[r][f.key] !== null)
    );
    setCustomizeRoles(anyOverride);

    setSaveOk(true);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Guards
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
            Waiting for session (is SessionContextProvider wrapping app?)…
          </div>
        )}
        <div>Loading session…</div>
      </div>
    );
  }

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
      <div className="absolute inset-y-0 left-0 md:left-16 right-0 bg-background p-6 space-y-8">
        {saveError ? (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        {saveOk ? (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>Feature visibility updated.</AlertDescription>
          </Alert>
        ) : null}

        <Card className="mt-14">
          {loading ? (
            <CardContent className="p-6">Loading…</CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Feature visibility</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Disable a feature for the whole building, or optionally
                      override per role.
                    </div>
                  </div>

                  {showDebug ? (
                    <div className="text-xs rounded bg-yellow-100 text-yellow-900 px-3 py-2">
                      {watchdog ? `debug: ${watchdog}` : 'debug: ok'}
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="pt-6 space-y-10">
                {/* Apply to all */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Apply to all roles
                    </h2>
                    <div className="text-xs text-muted-foreground">
                      Controls the whole building
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FEATURES.map((f) => (
                      <FeatureToggle
                        key={`base_${f.key}`}
                        id={`base_${f.key}`}
                        label={f.label}
                        checked={base[`base_${f.key}`]}
                        onCheckedChange={(v) => setBaseFeature(f.key, v)}
                        helper="Applies to managers, owners, and tenants"
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Customize per role */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Customize per role
                      </h2>
                      <div className="text-sm text-muted-foreground">
                        Overrides are optional. If set to “Inherit”, the role
                        follows the building-wide setting.
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label htmlFor="customizeRoles" className="text-sm">
                        Enable overrides
                      </Label>
                      <Switch
                        id="customizeRoles"
                        checked={customizeRoles}
                        onCheckedChange={(v) => {
                          setCustomizeRoles(v);
                          setSaveOk(false);
                          if (!v) clearAllOverrides();
                        }}
                      />
                    </div>
                  </div>

                  {!customizeRoles ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      Overrides are currently off. Turn on “Enable overrides” to
                      set different access for managers, owners, and tenants.
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {ROLES.map((r) => (
                        <div key={r.key}>
                          <h3 className="text-md font-semibold mb-3">
                            {r.label}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {FEATURES.map((f) => (
                              <FeatureOverride
                                key={`${r.key}_${f.key}`}
                                role={r.key}
                                featureKey={f.key}
                                label={f.label}
                                baseEnabled={base[`base_${f.key}`]}
                                value={overrides[r.key][f.key]} // null|true|false
                                onChange={(v) => setOverride(r.key, f.key, v)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional effective preview (for confidence) */}
                {featuresRow ? (
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium mb-2">
                      Effective visibility preview (based on saved row)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      This is how your navbar/pages should interpret settings.
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {ROLES.map((r) => (
                        <div
                          key={`preview_${r.key}`}
                          className="rounded-lg border p-3"
                        >
                          <div className="font-medium mb-2">{r.label}</div>
                          <div className="space-y-1 text-sm">
                            {FEATURES.map((f) => (
                              <div
                                key={`p_${r.key}_${f.key}`}
                                className="flex items-center justify-between"
                              >
                                <span>{f.label}</span>
                                <span className="text-muted-foreground">
                                  {isFeatureEnabled(featuresRow, r.key, f.key)
                                    ? 'On'
                                    : 'Off'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={resetAll}>
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

function FeatureToggle({ id, label, checked, onCheckedChange, helper }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <div className="text-xs text-muted-foreground">
          {helper || 'Visible in navigation and pages'}
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function FeatureOverride({
  role,
  featureKey,
  label,
  baseEnabled,
  value,
  onChange,
}) {
  // Select value must be string
  const selectValue =
    value === null ? 'inherit' : value === true ? 'enabled' : 'disabled';

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">
            Base: {baseEnabled ? 'On' : 'Off'} • Override: {selectValue}
          </div>
        </div>
      </div>

      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === 'inherit') onChange(null);
          else if (v === 'enabled') onChange(true);
          else onChange(false);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Inherit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inherit">
            Inherit (use building default)
          </SelectItem>
          <SelectItem value="enabled">Enabled for this role</SelectItem>
          <SelectItem value="disabled">Disabled for this role</SelectItem>
        </SelectContent>
      </Select>

      <div className="text-xs text-muted-foreground">
        {baseEnabled
          ? 'If you leave this as Inherit, the role will see this feature.'
          : 'Base is Off, so nobody sees it (even if you set Enabled here).'}
      </div>
    </div>
  );
}
