'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function LoginEmailPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');
    console.log("Submitting email:", email);

    const emailTrimmed = email.trim().toLowerCase();

    // 1. Check if user exists
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailTrimmed }),
    });

    const { exists, role, error: backendError } = await res.json();
    if (backendError) return setError(backendError);

    console.log("check-user response:", { exists, role, backendError });

    if (exists) {
      console.log("✅ User exists. Redirecting to password page...");
      await router.push(`/login/password?email=${encodeURIComponent(emailTrimmed)}`);
      return;
    }

    if (role?.trim().toLowerCase() === 'manager') {
      console.log("Invited as manager, redirecting to signup/manager...");
      return router.push(`/signup/manager?email=${encodeURIComponent(emailTrimmed)}`);
    }

    // 2. Check for tenant/owner invite
    const { data: invite } = await supabase
      .from('invitations')
      .select('role')
      .eq('email', emailTrimmed)
      .eq('status', 'pending')
      .maybeSingle();

    if (invite?.role === 'tenant') {
      return router.push(`/signup/tenant?email=${encodeURIComponent(emailTrimmed)}`);
    }

    if (invite?.role === 'owner') {
      return router.push(`/signup/owner?email=${encodeURIComponent(emailTrimmed)}`);
    }

    // 4. Fallback: general registration
    router.push(`/signup?email=${encodeURIComponent(emailTrimmed)}`);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold text-center mb-6">Enter your email</h2>
        {error && <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded">{error}</div>}

        <form onSubmit={handleContinue} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
