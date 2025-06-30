'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import dayjs from 'dayjs';

export default function OwnerResourceBooking({ resourceId }) {
    const supabase = useSupabaseClient();
    const session = useSession();

    const [selectedDate, setSelectedDate] = useState(
        dayjs().format('YYYY-MM-DD')
    );
    const [slots, setSlots] = useState([]);
    const [filterTime, setFilterTime] = useState('00:00');
    const [loading, setLoading] = useState(false);

    /* fetch slots whenever date or resource changes */
    useEffect(() => {
        if (resourceId && session) fetchSlots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resourceId, selectedDate, session?.user?.id]);

    const fetchSlots = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('fn_get_available_slots', {
            p_resource: resourceId,
            p_date: selectedDate,
            p_user: session.user.id,
        });
        if (error) console.error(error);

        setSlots(
            (data || []).map((s) => ({
                start_at: s.start_at,
                end_at: s.end_at,
                seats_left: s.seats_left,
                time_label: dayjs(s.start_at).format('HH:mm'),
            }))
        );
        setLoading(false);
    };

    const handleBook = async (slot) => {
        const res = await fetch('/api/resources/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resource_id: resourceId,
                start_at: slot.start_at,
                end_at: slot.end_at,
            }),
        });
        if (res.ok) fetchSlots();
        else alert('Unable to book this slot.');
    };

    const visible = slots.filter((s) => s.time_label >= filterTime);

    return (
        <div className="p-6 border rounded-lg bg-white">
            {/* date picker */}
            <div className="mb-4">
                <label className="block mb-1">Select date</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="p-2 border rounded w-full"
                />
            </div>

            {/* time filter */}
            <div className="mb-4">
                <label className="block mb-1">Show slots after</label>
                <input
                    type="time"
                    value={filterTime}
                    onChange={(e) => setFilterTime(e.target.value)}
                    className="p-2 border rounded w-full"
                />
            </div>

            {loading ? (
                <p>Loading…</p>
            ) : visible.length ? (
                <div className="space-y-2">
                    {visible.map((s) => (
                        <div
                            key={s.start_at}
                            className="p-3 border rounded flex justify-between items-center"
                        >
                            <span>
                                {dayjs(s.start_at).format('h:mm A')} –{' '}
                                {dayjs(s.end_at).format('h:mm A')}
                            </span>
                            <button
                                disabled={s.seats_left === 0}
                                onClick={() => handleBook(s)}
                                className={`px-4 py-2 rounded text-white ${s.seats_left
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {s.seats_left ? 'Book' : 'Full'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No slots available.</p>
            )}
        </div>
    );
}
