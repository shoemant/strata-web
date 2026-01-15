'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { supabase } from '@/utils/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { TERMS_VERSION } from '@/lib/terms';

export default function AcceptTermsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = useMemo(() => {
    const r = searchParams.get('returnTo');
    return r && r.startsWith('/') ? r : '/';
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // Must be logged in to accept
      if (!user) {
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      // If already accepted this version, bounce back
      const { data: existing, error: checkErr } = await supabase
        .from('terms_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();

      if (checkErr) {
        setError('Could not check terms status.');
        setLoading(false);
        return;
      }

      if (existing?.id) {
        router.replace(returnTo);
        return;
      }

      setLoading(false);
    };

    run();
  }, [router, returnTo]);

  const onAccept = async (e) => {
    e.preventDefault();
    setError('');

    if (!agree) {
      setError('You must agree to the Terms & Conditions to continue.');
      return;
    }

    setSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc(
        'ensure_terms_acceptance_for_current_user',
        { p_terms_version: TERMS_VERSION }
      );

      if (rpcErr) throw rpcErr;

      router.replace(returnTo);
    } catch (err) {
      setError(err?.message || 'Could not save your acceptance.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-primary">
          <Spinner className="h-6 w-6 mb-3" />
          <span className="text-lg font-medium">Loading…</span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-lg bg-card text-foreground space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Accept Terms</h1>
          <p className="text-sm text-muted-foreground">
            Before continuing, you must accept the Terms & Conditions (version{' '}
            {TERMS_VERSION}).
          </p>
        </div>

        <div className="rounded-xl border p-4 text-sm text-foreground/80 dark:text-neutral-300 space-y-2">
          <p>Please review:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Terms & Conditions
              </a>
            </li>
            <li>
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        <form onSubmit={onAccept} className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-foreground/80 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border border-input"
            />
            <span>
              I agree to the Terms & Conditions and acknowledge the Privacy
              Policy.
            </span>
          </label>

          {error ? (
            <p className="text-destructive dark:text-red-400 text-sm">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 
                       transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Spinner className="h-5 w-5" /> Saving…
              </>
            ) : (
              'Continue'
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            You will be redirected back to your dashboard after accepting.
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
