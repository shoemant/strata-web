'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import InviteTenantForm from '@/components/InviteTenantForm';

export default function InviteTenantPage() {
    const supabase = useSupabaseClient();
    const user = useUser();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, building_id')
                .eq('id', user.id)
                .single();

            if (!error) setProfile(data);
            setLoading(false);
        };

        fetchProfile();
    }, [user, supabase]);

    if (loading) return <p className="p-4">Loading...</p>;
    if (!profile?.building_id) return <p>No building assigned.</p>;

    return (
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Invite a Tenant</h1>
            <InviteTenantForm ownerId={profile.id} buildingId={profile.building_id} />
        </div>
    );
}
