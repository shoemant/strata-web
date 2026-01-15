'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

// shadcn/ui
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// icons
import { User2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();

  const returnTo = params.get('returnTo') || '/';
  const preview = params.get('preview') === '1';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  // For debugging / clarity
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!user) {
        router.replace(
          `/login?next=${encodeURIComponent('/onboarding/profile?returnTo=' + encodeURIComponent(returnTo))}`
        );
        return;
      }

      // ✅ Guardrail: try to apply any pending invites for this user
      // This will set role/building/unit in user_profiles for any matching pending invites.
      try {
        await supabase.rpc('accept_invites_for_current_user');
      } catch (e) {
        // It's okay if this fails due to RLS or no invites; we'll still load profile below.
        console.warn('accept_invites_for_current_user warning:', e);
      }

      // Load profile (now likely includes role/building)
      const { data: profile, error: profErr } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profErr) {
        setError(profErr.message);
      } else {
        setFullName(profile?.full_name || '');
        setRole(profile?.role || null);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, returnTo]);

  const save = async (e) => {
    e.preventDefault();
    setError('');

    if (preview) {
      router.replace(returnTo);
      return;
    }

    setSaving(true);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      setSaving(false);
      router.replace('/login');
      return;
    }

    const cleanName = String(fullName || '').trim();
    if (!cleanName) {
      setSaving(false);
      setError('Full name is required.');
      return;
    }

    // Save name
    const { error: upsertErr } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, full_name: cleanName }, { onConflict: 'id' });

    if (upsertErr) {
      setSaving(false);
      setError(upsertErr.message);
      return;
    }

    // ✅ Re-check role after saving.
    // If role is still missing, redirecting to / will cause the loop again.
    const { data: prof2, error: prof2Err } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    setSaving(false);

    if (prof2Err) {
      setError(prof2Err.message);
      return;
    }

    if (!prof2?.role) {
      setError(
        'Your account does not have a role yet (manager/owner/tenant). Please accept an invite link sent to your email, or ask a manager to resend it.'
      );
      return;
    }

    router.replace(returnTo);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-2 border">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Complete your profile</CardTitle>
                <CardDescription>We’re loading your details…</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md mx-auto shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-2 border bg-muted/50">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Complete your profile</CardTitle>
                <CardDescription>
                  We’re missing a couple of details.
                </CardDescription>
              </div>
            </div>
            {preview && (
              <div className="inline-flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Preview
              </div>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-4 pt-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Optional helpful hint if role is missing */}
          {!role && !error && (
            <Alert>
              <AlertTitle>Role not set yet</AlertTitle>
              <AlertDescription className="text-sm">
                Your account doesn’t have a role (manager/owner/tenant) yet. If
                you were invited, open the invite link in your email and accept
                it.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="e.g. Alex Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This name is shown on notices, bookings, and messages.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.replace(returnTo)}
              >
                Skip for now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
