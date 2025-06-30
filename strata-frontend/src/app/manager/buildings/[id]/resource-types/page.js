'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { confirm } from '@/lib/confirm';

export default function ResourceTypesPage() {
    const { id: buildingId } = useParams();
    const supabase = useSupabaseClient();

    const [rows, setRows] = useState([]);

    useEffect(() => {
        fetchTypes();
    }, [buildingId]);

    const fetchTypes = async () => {
        const { data } = await supabase
            .from('resource_types')
            .select('*')
            .or(`building_id.eq.${buildingId},building_id.is.null`) // global + local
            .order('id');
        setRows(data || []);
    };

    const handleDelete = async id => {
        if (!(await confirm('Delete this type?'))) return;
        await supabase.from('resource_types').delete().eq('id', id);
        fetchTypes();
    };

    return (
        <main className="p-6">
            <div className="flex justify-between mb-6">
                <h1 className="text-2xl font-semibold">Resource types</h1>
                <Link
                    href={`/manager/buildings/${buildingId}/resource-types/new`}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    + New type
                </Link>
            </div>

            <ul className="grid gap-4">
                {rows.map(t => (
                    <li key={t.id} className="p-4 border rounded flex justify-between">
                        <div>
                            <h2 className="font-medium">
                                {t.name}
                                {t.building_id ? '' : ' (global)'}
                            </h2>
                            {t.description && (
                                <p className="text-sm text-gray-600">{t.description}</p>
                            )}
                        </div>
                        {t.building_id && (
                            <div className="space-x-2">
                                <Link
                                    href={`/manager/buildings/${buildingId}/resource-types/${t.id}`}
                                    className="px-3 py-1 bg-gray-200 rounded"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </main>
    );
}
