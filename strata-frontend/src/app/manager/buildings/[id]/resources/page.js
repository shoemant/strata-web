'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';   // ⬅️ NEW
import { confirm } from '@/lib/confirm';           // tiny helper (see below)

export default function ManagerResourcesPage() {
    const { id: buildingId } = useParams();      // ⬅️ grab the route param
    const supabase = useSupabaseClient();
    const user = useUser();

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && buildingId) fetchResources();
    }, [user, buildingId]);

    const fetchResources = async () => {
        const { data, error } = await supabase
            .from('resources')
            .select('id,name,is_active,total_spots,booking_interval_minutes')
            .eq('building_id', buildingId);

        if (error) console.error(error);
        setResources(data || []);
        setLoading(false);
    };

    const toggleActive = async (id, value) => {
        await supabase.from('resources').update({ is_active: value }).eq('id', id);
        fetchResources();
    };

    if (loading) return <p className="p-6">Loading…</p>;

    const handleDelete = async id => {
        if (!(await confirm('Really delete this resource?'))) return;
        await supabase.from('resources').delete().eq('id', id);
        fetchResources();
    };

    return (
        <main className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Manage amenities</h1>
                <Link
                    href={`/manager/buildings/${buildingId}/resources/new`}     // ⬅️ keep the path nested
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    + New resource
                </Link>
            </div>

            {!resources.length ? (
                <p>No resources yet.</p>
            ) : (
                <ul className="grid gap-4">
                    {resources.map(r => (
                        <li key={r.id} className="p-4 border rounded-xl flex justify-between">
                            <div>
                                <h2 className="font-medium">{r.name}</h2>
                                <p className="text-sm text-gray-600">
                                    {r.total_spots} spots · {r.booking_interval_minutes}-min slots
                                </p>
                            </div>

                            <div className="space-x-2">
                                <Link
                                    href={`/manager/buildings/${buildingId}/resources/${r.id}`}
                                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => toggleActive(r.id, !r.is_active)}
                                    className={`px-3 py-1 rounded ${r.is_active ? 'bg-emerald-600' : 'bg-gray-400'
                                        } text-white`}
                                >
                                    {r.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    className="px-3 py-1 rounded bg-red-600 text-white"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
