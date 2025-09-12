'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') || '/';
  const [loading, setLoading] = useState(true);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace('/login');

    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, full_name: fullName }, { onConflict: 'id' });

    if (error) setError(error.message);
    else {
      const { data: fresh } = await supabase.auth.getSession();
      if (!fresh?.session) {
        console.warn('No session after onboarding save; redirecting to /login');
        return router.replace('/login');
      }
      router.replace(returnTo);
    }
  };

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={save} className="max-w-md w-full bg-white p-6 rounded-lg border space-y-4">
        <h1 className="text-xl font-semibold">Complete your profile</h1>
        <p className="text-sm text-gray-600">We’re missing a couple of details.</p>
        <label className="block space-y-1">
          <span className="text-sm text-gray-700">Full name</span>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Alex Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
          <button type="button" onClick={() => router.replace(returnTo)} className="px-3 py-2 border rounded">
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
