'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export default function GeneralSignupPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    const { error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) return setError(signupError.message);
    router.push('/complete-profile');
  };

  return (
    <div className="p-8">
      <form onSubmit={handleSignup} className="bg-white p-6 rounded shadow w-full max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Complete Signup</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          defaultValue={email}
          className="border w-full p-2 mb-4"
          disabled
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border w-full p-2 mb-4"
        />
        <button className="bg-green-600 text-white py-2 w-full rounded">Sign Up</button>
      </form>
    </div>
  );
}