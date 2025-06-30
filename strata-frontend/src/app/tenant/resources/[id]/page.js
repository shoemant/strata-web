'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import dayjs from 'dayjs';

import SelectDate from './SelectDate';
import OwnerResourceBooking from './OwnerResourceBooking';

export default function ResourceDetail() {
    const { id } = useParams();           // /owner/resources/[id]
    const searchParams = useSearchParams();
    const date = searchParams.get('date') ?? dayjs().format('YYYY-MM-DD');

    const supabase = useSupabaseClient();
    const user = useUser();

    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);

    /* -------------------------------------------------------------- */
    useEffect(() => {
        if (user) fetchResource();
    }, [user, id]);

    const fetchResource = async () => {
        /* 1 · user’s building */
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

        /* 2 · resource meta */
        const { data, error } = await supabase
            .from('resources')
            .select('id,name,location_description')
            .eq('id', id)
            .eq('building_id', profile.building_id)
            .single();

        if (error) console.error('Resource fetch error:', error.message);
        setResource(data || null);
        setLoading(false);
    };

    /* -------------------------------------------------------------- */
    if (loading) {
        return <p className="p-6">Loading resource…</p>;
    }

    if (!resource) {
        return (
            <main className="p-6">
                <p className="text-red-600">Resource not found or inaccessible.</p>
            </main>
        );
    }

    return (
        <main className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold mb-1">{resource.name}</h1>
            <p className="text-gray-600 mb-6">{resource.location_description}</p>

            <SelectDate resourceId={id} currentDate={date} />
            <OwnerResourceBooking resourceId={id} />
        </main>
    );
}
