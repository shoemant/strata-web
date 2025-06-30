'use client';
import useSWR from 'swr';
import dayjs from 'dayjs';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function SlotGrid({ resourceId, date }) {
    const { data, error, mutate } = useSWR(
        `/api/resources/${resourceId}/slots?date=${date}`,
        fetcher
    );

    if (error) return <p className="text-red-600">Failed to load slots.</p>;
    if (!data) return <p>Loading…</p>;

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
        if (res.ok) mutate(); // refresh slots
        else alert('Unable to book.');
    };

    return (
        <div className="grid grid-cols-3 gap-3 mt-6">
            {data.map((slot) => (
                <button
                    key={slot.start_at}
                    disabled={slot.seats_left === 0}
                    onClick={() => handleBook(slot)}
                    className={`p-2 rounded-lg border text-sm ${slot.seats_left
                        ? 'hover:bg-green-200'
                        : 'opacity-40 cursor-not-allowed'
                        }`}
                >
                    {dayjs(slot.start_at).format('h:mm A')}
                    <br />
                    <span className="text-gray-600">
                        {slot.seats_left} / {slot.capacity ?? '∞'}
                    </span>
                </button>
            ))}
        </div>
    );
}
