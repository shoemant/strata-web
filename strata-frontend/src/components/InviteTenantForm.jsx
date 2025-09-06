'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function InviteTenantForm({ ownerId, buildingId }) {
  const [email, setEmail] = useState('');
  const [unitId, setUnitId] = useState('');
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, label')
        .eq('building_id', buildingId);

      if (error) {
        console.error('Failed to load units:', error);
      } else {
        setUnits(data);
      }
    };

    fetchUnits();
  }, [buildingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !unitId) {
      setError('Please fill out all fields.');
      return;
    }

    const { data: existing } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('unit_id', unitId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      setError('An invitation for this tenant already exists.');
      return;
    }

    const { error: insertError } = await supabase.from('invitations').insert([
      {
        email,
        role: 'tenant',
        unit_id: unitId,
        building_id: buildingId,
        token: uuidv4(),
        sent_by: ownerId,
      },
    ]);

    if (insertError) {
      console.error('Error inserting invitation:', insertError);
      setError('Failed to send invitation.');
    } else {
      setSuccess('Invitation sent successfully.');
      setEmail('');
      setUnitId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}

      <input
        type="email"
        placeholder="Tenant email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded"
        required
      />

      <select
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded"
        required
      >
        <option value="">Select unit</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Invite Tenant
      </button>
    </form>
  );
}
