'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function TenantAnnouncementsPage() {
    const supabase = useSupabaseClient();
    const user = useUser();
    const [announcements, setAnnouncements] = useState([]);
    const [buildingName, setBuildingName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchAnnouncements();
    }, [user]);

    const fetchAnnouncements = async () => {
        /* tenant’s building + role ------------------------------------ */
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('building_id, role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.building_id) {
            console.error('Failed to fetch profile:', profileError);
            setLoading(false);
            return;
        }

        /* building name ------------------------------------------------ */
        const { data: buildingData } = await supabase
            .from('buildings')
            .select('name')
            .eq('id', profile.building_id)
            .single();

        setBuildingName(buildingData?.name || '');

        /* announcements for “all” or “tenant” ------------------------- */
        const { data: announcementsData, error: announcementsError } =
            await supabase
                .from('announcements')
                .select('*')
                .eq('building_id', profile.building_id)
                .in('target_audience', ['all', 'tenant'])
                .order('created_at', { ascending: false });

        if (announcementsError) {
            console.error('Error fetching announcements:', announcementsError);
        } else {
            setAnnouncements(announcementsData);
        }

        setLoading(false);
    };

    if (loading) return <p className="p-4">Loading announcements…</p>;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">
                Announcements for {buildingName}
            </h1>

            {announcements.length === 0 ? (
                <p className="text-gray-500">No announcements yet.</p>
            ) : (
                <ul className="space-y-4">
                    {announcements.map(a => (
                        <li key={a.id} className="border p-4 rounded bg-white shadow-sm">
                            <h2 className="text-lg font-semibold">{a.title}</h2>
                            <p className="text-sm text-gray-700 mt-1">{a.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                                Posted {new Date(a.created_at).toLocaleString()}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
