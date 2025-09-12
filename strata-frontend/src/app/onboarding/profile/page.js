'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

// shadcn/ui
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// icons
import { User2, AlertCircle, CheckCircle2 } from 'lucide-react';

// optional toast (if you’ve generated it with shadcn)
// import { useToast } from "@/components/ui/use-toast";

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') || '/';

  // Preview mode lets you load & interact with this page
  // without committing changes to the DB (great for QA/UX checks).
  const preview = params.get('preview') === '1';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent('/onboarding/profile')}`);
        return;
      }
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else {
        setFullName(profile?.full_name || '');
      }
      setLoading(false);
    })();
  }, [router]);

  const save = async (e) => {
    e.preventDefault();
    setError('');

    // In preview mode, do nothing persistent—just bounce back.
    if (preview) {
      // If you use toasts, you can show a quick “Preview only” toast here.
      // toast({ title: "Preview", description: "No changes were saved." });
      router.replace(returnTo);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, full_name: fullName }, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      setError(error.message);
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
                <CardDescription>We’re missing a couple of details.</CardDescription>
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
