'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

const WEEKDAYS = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export default function WeeklyAvailabilityEditor({ resourceId }) {
    const supabase = useSupabaseClient();
    const [rows, setRows] = useState([]);

    /* fetch existing rows -------------------------------------------- */
    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('resource_availability')
                .select('id,weekday,start_time,end_time')
                .eq('resource_id', resourceId);
            setRows(
                (data || []).length
                    ? data
                    : WEEKDAYS.map((_, i) => ({
                        weekday: i,
                        start_time: '00:00',
                        end_time: '00:00',
                        id: null,
                    })),
            );
        })();
    }, [resourceId]);

    const updateRow = (idx, field, value) =>
        setRows(rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

    const saveAll = async () => {
        const inserts = rows.map(r => ({
            resource_id: resourceId,
            weekday: r.weekday,
            start_time: r.start_time,
            end_time: r.end_time,
            id: r.id, // existing id kept for upsert
        }));

        const { error } = await supabase
            .from('resource_availability')
            .upsert(inserts, { onConflict: 'id' });

        if (error) alert(error.message);
        else alert('Availability saved.');
    };

    return (
        <section>
            <h2 className="text-xl font-semibold mb-3">Weekly availability</h2>

            <div className="space-y-2">
                {rows.map((r, i) => (
                    <div key={i} className="grid md:grid-cols-3 gap-2 items-center">
                        <span>{WEEKDAYS[r.weekday]}</span>
                        <input
                            type="time"
                            value={r.start_time}
                            onChange={e => updateRow(i, 'start_time', e.target.value)}
                            className="p-2 border rounded"
                        />
                        <input
                            type="time"
                            value={r.end_time}
                            onChange={e => updateRow(i, 'end_time', e.target.value)}
                            className="p-2 border rounded"
                        />
                    </div>
                ))}
            </div>

            <button
                onClick={saveAll}
                className="mt-4 px-4 py-2 rounded bg-emerald-600 text-white"
            >
                Save availability
            </button>
        </section>
    );
}
