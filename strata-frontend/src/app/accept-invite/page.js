'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        setError('Invalid or expired invite link.');
      } else {
        setInvite(data);
      }
    };

    fetchInvite();
  }, [token]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!invite) return;

    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: invite.email,
      password,
    });

    if (signupError) return setError(signupError.message);

    const userId = authData?.user?.id;
    if (!userId) return setError('User ID is missing after sign up.');

    const { error: profileError } = await supabase.from('user_profiles').upsert(
      {
        id: userId,
        email: invite.email,
        role: invite.role,
        building_id: invite.building_id,
      },
      { onConflict: 'id' }
    );

    if (profileError) return setError(profileError.message);

    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date() })
      .eq('id', invite.id);

    router.push('/login');
  };

  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!invite) return <div className="p-4">Validating invitation...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSignup}
        className="space-y-4 w-full max-w-md p-6 bg-white shadow rounded"
      >
        <h2 className="text-xl font-bold">Complete Your Registration</h2>
        <p>
          Invited as a {invite.role} for building ID: {invite.building_id}
        </p>
        <input
          type="password"
          placeholder="Choose a password"
          className="w-full p-2 border border-gray-300 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
