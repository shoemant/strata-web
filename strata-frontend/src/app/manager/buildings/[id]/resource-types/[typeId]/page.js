'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ResourceTypeForm from '@/components/ResourceTypeForm';

export default function EditResourceTypePage() {
    const { id: buildingId, typeId } = useParams();
    const router = useRouter();
    const supabase = useSupabaseClient();
    const [type, setType] = useState(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('resource_types')
                .select('*')
                .eq('id', typeId)
                .eq('building_id', buildingId)
                .single();
            setType(data);
        })();
    }, [typeId, buildingId]);

    const handleSave = async values => {
        const { error } = await supabase
            .from('resource_types')
            .update(values)
            .eq('id', typeId)
            .eq('building_id', buildingId);
        if (error) return alert(error.message);
        router.push(`/manager/buildings/${buildingId}/resource-types`);
    };

    if (!type) return <p className="p-6">Loading…</p>;

    return (
        <main className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Edit type</h1>
            <ResourceTypeForm initial={type} onSave={handleSave} />
        </main>
    );
}
