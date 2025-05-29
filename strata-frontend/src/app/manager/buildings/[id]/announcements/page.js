'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function AnnouncementsPage() {
  const { id: buildingId } = useParams();
  const supabase = useSupabaseClient();

  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({
    title: '',
    message: '',
    target_audience: 'all',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      fetchAnnouncements();
    }
  }, [buildingId]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    console.log('Announcements data:', data);
    console.log('Announcements error:', error);
    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    const { title, message, target_audience } = form;
    const { error } = await supabase.from('announcements').insert([
      {
        title,
        message,
        target_audience,
        building_id: buildingId,
        created_by: userId,
      },
    ]);

    console.log('Submitting announcement:', {
      title,
      message,
      target_audience,
      building_id: buildingId,
      created_by: userId,
    });

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId);

    console.log('Profile:', profileData);

    if (error) {
      console.error('Insert error:', error);
    } else {
      setForm({ title: '', message: '', target_audience: 'all' });
      fetchAnnouncements();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Announcements</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
          required
          className="w-full p-2 border rounded"
        />
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Message"
          required
          className="w-full p-2 border rounded"
        />
        <select
          value={form.target_audience}
          onChange={(e) =>
            setForm({ ...form, target_audience: e.target.value })
          }
          className="w-full p-2 border rounded"
        >
          <option value="all">All</option>
          <option value="owners">Owners</option>
          <option value="tenants">Tenants</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Post Announcement
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements yet.</p>
      ) : (
        <ul className="space-y-4">
          {announcements.map((a) => (
            <li key={a.id} className="border p-4 rounded shadow bg-white">
              <h3 className="font-semibold text-lg">{a.title}</h3>
              <p className="text-sm text-gray-600">{a.message}</p>
              <p className="text-xs text-gray-400">To: {a.target_audience}</p>
              <p className="text-xs text-gray-400">
                {new Date(a.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
