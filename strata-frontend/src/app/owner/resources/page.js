'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { format, getDay, parse, isBefore, addMinutes } from 'date-fns';

export default function OwnerResourceBooking() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [filterTime, setFilterTime] = useState('00:00');

  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (session) fetchResources();
  }, [session]);

  const fetchResources = async () => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('building_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return;

    const { data: resourceData } = await supabase
      .from('resources')
      .select('id, name')
      .eq('building_id', profile.building_id)
      .eq('is_active', true);

    setResources(resourceData || []);
  };

  useEffect(() => {
    if (selectedResource && selectedDate) fetchSlots();
  }, [selectedResource, selectedDate]);

  const fetchSlots = async () => {
    const weekday = getDay(new Date(selectedDate));

    const { data: slotsData, error } = await supabase
      .from('resource_time_slots')
      .select('id, time_label, start_time, end_time, weekday, capacity')
      .eq('resource_id', selectedResource)
      .eq('weekday', weekday);

    if (error) {
      console.error('Slot fetch error:', error.message);
      return;
    }

    if (!slotsData || slotsData.length === 0) {
      setSlots([]);
      return;
    }

    const { data: bookings } = await supabase
      .from('resource_slot_bookings')
      .select('slot_id')
      .eq('booking_date', selectedDate);

    const bookedSet = new Set((bookings || []).map((b) => b.slot_id));

    const finalSlots = slotsData.map((slot) => ({
      ...slot,
      time: `${format(new Date(slot.start_time), 'HH:mm')} - ${format(new Date(slot.end_time), 'HH:mm')}`,
      booked: bookedSet.has(slot.id),
      slot_key: slot.id,
    }));

    setSlots(finalSlots);
  };

  const handleBook = async (slot) => {
    const { error } = await supabase.from('resource_slot_bookings').insert({
      slot_id: slot.slot_key,
      user_id: session.user.id,
      booking_date: selectedDate,
      time_label: slot.time_label,
    });

    if (!error) fetchSlots();
    else console.error('Booking fetch error:', error);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Book a Resource</h1>

      <div className="mb-4">
        <label className="block mb-1">Select Resource</label>
        <select
          className="p-2 border rounded w-full"
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
        >
          <option value="">-- Choose --</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1">Select Date</label>
        <input
          type="date"
          className="p-2 border rounded w-full"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1">Show Slots After</label>
        <input
          type="time"
          className="p-2 border rounded w-full"
          value={filterTime}
          onChange={(e) => setFilterTime(e.target.value)}
        />
      </div>

      {slots.length > 0 ? (
        <div className="space-y-2">
          {slots
            .filter((s) => s.time_label >= filterTime)
            .map((s) => (
              <div
                key={s.slot_key}
                className="p-3 border rounded flex justify-between items-center bg-white"
              >
                <span>{s.time}</span>
                <button
                  className={`px-4 py-2 rounded text-white ${
                    s.booked
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  onClick={() => handleBook(s)}
                  disabled={s.booked}
                >
                  {s.booked ? 'Booked' : 'Book'}
                </button>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-500">No slots available for selected day.</p>
      )}
    </div>
  );
}
