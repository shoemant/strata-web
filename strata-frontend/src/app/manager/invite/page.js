'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function InviteForm({ buildingId }) {
  const supabase = useSupabaseClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tenant');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = uuidv4();

    const { data: existing, error: existingError } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .eq('building_id', buildingId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      setError('An invitation has already been sent to this email.');
      return;
    }

    const { error: insertError } = await supabase.from('invitations').insert([
      {
        email,
        role,
        building_id: buildingId,
        token,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Email failed to send');
      }

      setSuccess('Invitation sent successfully!');
      setEmail('');
    } catch (err) {
      console.error(err);
      setError('Failed to send email. Please try again.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <form
        onSubmit={handleInvite}
        className="space-y-4 max-w-md bg-white p-6 rounded shadow"
      >
        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">{success}</p>}

        <input
          type="email"
          placeholder="Email to invite"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="tenant">Tenant</option>
          <option value="owner">Owner</option>
        </select>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Send Invitation
        </button>
      </form>
    </ProtectedRoute>
  );
}
