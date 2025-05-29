'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function CompleteProfilePage() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const session = useSession();
  const user = session?.user;
  const [role, setRole] = useState('tenant');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{ id: user.id, email: user.email, role }]);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    router.push(`/${role}/dashboard`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold text-center mb-6">
          Complete Your Profile
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-gray-700 text-sm">Select your role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded"
              required
            >
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
            </select>
          </label>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
