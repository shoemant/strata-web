'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ResourceForm from '@/components/ResourceForm';
import WeeklyAvailabilityEditor from '@/components/WeeklyAvailabilityEditor';

export default function EditResourcePage() {
    const { id: buildingId, resourceId } = useParams();  // gets both route params
    const supabase = useSupabaseClient();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (resourceId) fetchResource();
    }, [resourceId]);

    const fetchResource = async () => {
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .eq('id', resourceId)
            .eq('building_id', buildingId)    // extra guard
            .single();

        if (error) console.error(error);
        setResource(data);
        setLoading(false);
    };

    const handleSave = async values => {
        const { error } = await supabase
            .from('resources')
            .update(values)
            .eq('id', resourceId)
            .eq('building_id', buildingId);

        if (error) return alert(error.message);
        fetchResource();
    };

    if (loading) return <p className="p-6">Loading…</p>;
    if (!resource) return <p className="p-6 text-red-600">Not found.</p>;

    return (
        <main className="p-6 max-w-3xl mx-auto space-y-8">
            <ResourceForm initial={resource} onSave={handleSave} buildingId={buildingId} />
            <WeeklyAvailabilityEditor resourceId={resourceId} />
        </main>
    );
}
