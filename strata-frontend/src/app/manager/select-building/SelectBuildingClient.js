// src/app/manager/select-building/SelectBuildingClient.js
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';

export default function SelectBuildingClient() {
    const user = useUser();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [buildings, setBuildings] = useState([]);
    const nextPage = searchParams.get('next') || 'dashboard';

    useEffect(() => {
        const fetchBuildings = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('manager_buildings')
                .select(
                    'building_id, buildings!manager_buildings_building_id_fkey(name, id)'
                )
                .eq('user_id', user.id);

            if (!error && data) {
                const buildingList = data.map((b) => b.buildings);
                setBuildings(buildingList);

                if (buildingList.length === 1) {
                    router.push(`/manager/buildings/${buildingList[0].id}/${nextPage}`);
                }
            }
        };

        fetchBuildings();
    }, [user]);

    return (
        <div className="p-6 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-4">Select a Building</h1>
            <ul className="space-y-4">
                {buildings.map((b) => (
                    <li key={b.id}>
                        <button
                            onClick={() =>
                                router.push(`/manager/buildings/${b.id}/${nextPage}`)
                            }
                            className="block w-full text-left p-4 border rounded bg-white hover:bg-gray-50 shadow"
                        >
                            {b.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
