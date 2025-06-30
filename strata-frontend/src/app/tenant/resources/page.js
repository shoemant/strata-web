'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import Link from 'next/link';

export default function ResourcesPage() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  /* fetch once we have a user */
  useEffect(() => {
    if (user) fetchResources();
  }, [user]);

  const fetchResources = async () => {
    /* 1 · user’s building -------------------------------------------- */
    const { data: profile, error: pe } = await supabase
      .from('user_profiles')
      .select('building_id')
      .eq('id', user.id)
      .single();

    if (pe || !profile?.building_id) {
      console.error('Failed user building lookup:', pe?.message);
      setLoading(false);
      return;
    }

    /* 2 · active resources ------------------------------------------- */
    const { data, error } = await supabase
      .from('resources')
      .select('id,name,location_description')
      .eq('is_active', true)
      .eq('building_id', profile.building_id);

    if (error) console.error('Resource fetch error:', error.message);
    setResources(data || []);
    setLoading(false);
  };

  /* render ----------------------------------------------------------- */
  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Amenities</h1>

      {resources.length === 0 ? (
        <p className="text-gray-500">No active amenities found.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((r) => (
            <li key={r.id} className="border rounded-xl p-4">
              <h2 className="text-lg font-medium">{r.name}</h2>
              <p className="text-sm text-gray-600">{r.location_description}</p>
              <Link
                href={`/owner/resources/${r.id}`}
                className="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                View availability
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
