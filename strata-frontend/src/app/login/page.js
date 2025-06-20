'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginEmailPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');

    const emailTrimmed = email.trim().toLowerCase();
    console.log('Submitting email:', emailTrimmed);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      });

      const { exists, invite, error: backendError } = await res.json();
      console.log('check-user response:', { exists, invite, backendError });

      if (backendError) {
        setError(backendError);
        return;
      }

      if (exists) {
        return router.push(`/login/password?email=${encodeURIComponent(emailTrimmed)}`);
      }

      if (invite === 'manager') {
        return router.push(`/signup/manager?email=${encodeURIComponent(emailTrimmed)}`);
      }

      if (invite === 'tenant') {
        return router.push(`/signup/tenant?email=${encodeURIComponent(emailTrimmed)}`);
      }

      if (invite === 'owner') {
        return router.push(`/signup/owner?email=${encodeURIComponent(emailTrimmed)}`);
      }

      return router.push(`/signup?email=${encodeURIComponent(emailTrimmed)}`);
    } catch (err) {
      console.error('Error during email check:', err);
      setError('Something went wrong. Please try again later.');
    }
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
