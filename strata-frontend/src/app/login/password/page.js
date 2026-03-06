'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

// Put this near the top of each file (or extract to a shared util)
async function getProfileWithBuilding(supabase, userId) {
  // Join the unit to derive building_id when role is owner/tenant
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(
      `
      full_name,
      role,
      building_id,
      unit_id,
      units!user_profiles_unit_id_fkey ( building_id )  -- join via FK
    `
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  // Prefer explicit building_id; else derive from unit join
  const derivedBuildingId =
    profile?.building_id || profile?.units?.building_id || null;

  return { profile, buildingId: derivedBuildingId };
}

function landingPath(role, buildingId) {
  if (role === 'manager') {
    return buildingId
      ? `/manager/buildings/${buildingId}/dashboard`
      : `/manager/dashboard`;
  }
  if (role === 'owner') {
    return buildingId
      ? `/owner/buildings/${buildingId}/dashboard`
      : `/owner/dashboard`;
  }
  if (role === 'tenant') {
    return buildingId
      ? `/tenant/buildings/${buildingId}/dashboard`
      : `/tenant/dashboard`;
  }
  return '/';
}

export default function PasswordLogin() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message);
        return;
      }
      const user = loginData?.user;
      if (!user) {
        setError('Login succeeded but user data is missing.');
        return;
      }

      // Attach invites
      await supabase.rpc('accept_invites_for_current_user');

      // Fetch role + building via unit join
      const { profile, buildingId } = await getProfileWithBuilding(
        supabase,
        user.id
      );
      const landing = landingPath(profile?.role, buildingId);

      if (!profile?.full_name) {
        return router.push(
          `/onboarding/profile?returnTo=${encodeURIComponent(landing)}`
        );
      }

      router.push(landing);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while logging in.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow w-full max-w-md"
      >
        <h2 className="text-xl font-semibold mb-4">
          Enter Password for {email}
        </h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border w-full p-2 mb-4"
        />

        <button className="bg-blue-600 text-white py-2 w-full rounded mb-4">
          Log In
        </button>

        <div className="flex justify-between text-sm text-blue-600">
          <button
            type="button"
            onClick={() => router.back()}
            className="hover:underline"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/forgot-password?email=${encodeURIComponent(email || '')}`
              )
            }
            className="hover:underline"
          >
            Forgot Password?
          </button>
        </div>
      </form>
    </div>
  );
}
