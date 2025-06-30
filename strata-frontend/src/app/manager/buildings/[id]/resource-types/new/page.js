'use client';

import { useRouter, useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ResourceTypeForm from '@/components/ResourceTypeForm';

export default function NewResourceTypePage() {
    const { id: buildingId } = useParams();
    const router = useRouter();
    const supabase = useSupabaseClient();

    const handleSave = async values => {
        const { error } = await supabase
            .from('resource_types')
            .insert([{ ...values, building_id: buildingId }]);
        if (error) return alert(error.message);
        router.push(`/manager/buildings/${buildingId}/resource-types`);
    };

    return (
        <main className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Create type</h1>
            <ResourceTypeForm onSave={handleSave} />
        </main>
    );
}
