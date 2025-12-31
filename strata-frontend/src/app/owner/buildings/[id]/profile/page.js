'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(null);

  const [buildingName, setBuildingName] = useState(null);
  const [unitLabel, setUnitLabel] = useState(null);

  const [form, setForm] = useState({ full_name: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const email = useMemo(() => user?.email ?? '', [user?.email]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        if (!userId) return;

        // 1) fetch profile
        const { data: p, error: fetchErr } = await supabase
          .from('user_profiles')
          .select(
            'id, full_name, role, email, building_id, unit_id, created_at'
          )
          .eq('id', userId)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        // 2) create profile if missing (common after OAuth)
        let profileRow = p;

        if (!profileRow) {
          const insertPayload = {
            id: userId,
            email: email || null,
            full_name:
              user?.user_metadata?.full_name ||
              user?.user_metadata?.name ||
              null,
            role: null,
            building_id: null,
            unit_id: null,
          };

          const { data: inserted, error: insertErr } = await supabase
            .from('user_profiles')
            .insert(insertPayload)
            .select(
              'id, full_name, role, email, building_id, unit_id, created_at'
            )
            .single();

          if (insertErr) throw insertErr;
          profileRow = inserted;
        }

        if (cancelled) return;

        setProfile(profileRow);
        setForm({ full_name: profileRow?.full_name || '' });

        // 3) fetch building name (if present)
        if (profileRow?.building_id) {
          const { data: b, error: bErr } = await supabase
            .from('buildings')
            .select('name')
            .eq('id', profileRow.building_id)
            .maybeSingle();

          if (bErr) throw bErr;
          if (!cancelled) setBuildingName(b?.name || null);
        } else {
          setBuildingName(null);
        }

        // 4) fetch unit label (if present)
        if (profileRow?.unit_id) {
          const { data: u, error: uErr } = await supabase
            .from('units')
            .select('label, unit_number')
            .eq('id', profileRow.unit_id)
            .maybeSingle();

          if (uErr) throw uErr;

          const label = u?.label || u?.unit_number || null;
          if (!cancelled) setUnitLabel(label);
        } else {
          setUnitLabel(null);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, userId, supabase, email, user?.user_metadata]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!userId) throw new Error('Not signed in.');

      const payload = {
        full_name: form.full_name?.trim() || null,
        email: email || null,
      };

      const { data, error: updateErr } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', userId)
        .select('id, full_name, role, email, building_id, unit_id, created_at')
        .single();

      if (updateErr) throw updateErr;

      setProfile(data);
      setSuccess('Saved.');
    } catch (e) {
      setError(e?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              You must be signed in to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')}>Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    // Full-width container; sidebar offset should be handled by your layout.
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account details.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-60" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <div className="text-sm text-muted-foreground">
                    Signed in as
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {email || 'No email'}
                  </Badge>

                  <div className="text-sm text-muted-foreground sm:ml-2">
                    Role
                  </div>
                  <Badge
                    variant={profile?.role ? 'default' : 'secondary'}
                    className="w-fit"
                  >
                    {profile?.role || 'unassigned'}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Building:</span>
                    <Badge variant="outline" className="w-fit">
                      {buildingName || '—'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-2">
                    <span className="text-muted-foreground">Unit:</span>
                    <Badge variant="outline" className="w-fit">
                      {unitLabel || '—'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Editable fields */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  placeholder="e.g., John Smith"
                />
                <p className="text-xs text-muted-foreground">
                  This name is visible within your building.
                </p>
              </div>

              {/* Read-only contextual info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} readOnly />
                </div>

                <div className="space-y-2">
                  <Label>Account created</Label>
                  <Input
                    value={
                      profile?.created_at
                        ? new Date(profile.created_at).toLocaleString()
                        : ''
                    }
                    readOnly
                  />
                </div>
              </div>

              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
              {success ? (
                <div className="text-sm text-green-600">{success}</div>
              ) : null}
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setForm({ full_name: profile?.full_name || '' });
            }}
            disabled={loading || saving}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>

          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
