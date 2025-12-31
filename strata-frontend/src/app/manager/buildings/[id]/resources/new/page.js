'use client';

import { useRouter, useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ResourceForm from '@/components/ResourceForm';

export default function NewResourcePage() {
  const { id: buildingId } = useParams();
  const router = useRouter();
  const supabase = useSupabaseClient();

  const handleSubmit = async (values) => {
    console.log('INSERT values:', values);

    const { data, error } = await supabase
      .from('resources')
      .insert([{ ...values, building_id: buildingId }])
      .select('id')
      .single();

    if (error) {
      console.error('SUPABASE INSERT ERROR:', error);
      alert(error.message);
      return;
    }

    router.push(`/manager/buildings/${buildingId}/resources/${data.id}`);
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create resource</h1>
      <ResourceForm onSave={handleSubmit} buildingId={buildingId} />
    </main>
  );
}
