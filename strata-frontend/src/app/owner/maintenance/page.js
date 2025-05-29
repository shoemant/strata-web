'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function MaintenanceRequestPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [buildingId, setBuildingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('building_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch building:', error);
      } else {
        setBuildingId(data.building_id);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !buildingId || !user) return;

    setLoading(true);

    const { error } = await supabase.from('maintenance_requests').insert([
      {
        user_id: user.id,
        building_id: buildingId,
        title,
        description,
      },
    ]);

    if (error) {
      console.error('Insert error:', error);
    } else {
      setSuccess(true);
      setTitle('');
      setDescription('');
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Submit Maintenance Request</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <textarea
          placeholder="Describe the issue"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full p-2 border rounded h-32"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
        {success && (
          <p className="text-green-600 mt-2">Request submitted successfully!</p>
        )}
      </form>
    </div>
  );
}
