'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';

export default function BuildingResourcesPage() {
  const { id: buildingId } = useParams();
  const supabase = useSupabaseClient();
  const session = useSession();
  const [building, setBuilding] = useState([]);
  const [resources, setResources] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type_id: '',
    location: '',
    total_spots: '',
    available_start: '',
    available_end: '',
    booking_interval_minutes: '',
    selectedWeekdays: [],
  });
  const [newType, setNewType] = useState('');
  const [typeError, setTypeError] = useState('');

  useEffect(() => {
    if (buildingId) {
      fetchResources();
      fetchResourceTypes();
    }

    const fetchBuildings = async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', buildingId)
        .single();

      if (!error && data) setBuilding(data);
    };

    fetchBuildings();
  }, [buildingId]);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('*, resource_types(name), resource_availability(weekday)')
      .eq('building_id', buildingId);

    if (!error && data) setResources(data);
  };

  const fetchResourceTypes = async () => {
    const { data, error } = await supabase
      .from('resource_types')
      .select('*')
      .eq('building_id', buildingId);

    if (!error && data) setResourceTypes(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      name,
      type_id,
      location,
      total_spots,
      available_start,
      available_end,
      booking_interval_minutes,
      selectedWeekdays,
    } = form;

    const { data: resourceData, error: insertError } = await supabase
      .from('resources')
      .insert([
        {
          name,
          type_id,
          location_description: location,
          total_spots: Number(total_spots),
          available_start,
          available_end,
          booking_interval_minutes: Number(booking_interval_minutes),
          building_id: buildingId,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError.message);
      return;
    }

    const availabilityInserts = selectedWeekdays.map((weekday) => ({
      resource_id: resourceData.id,
      weekday,
      start_time: available_start,
      end_time: available_end,
    }));

    const { error: availabilityError } = await supabase
      .from('resource_availability')
      .insert(availabilityInserts);

    if (availabilityError) {
      console.error('Availability insert error:', availabilityError.message);
    }

    const slotInserts = [];
    const startHour = parseInt(available_start.split(':')[0], 10);
    const startMinute = parseInt(available_start.split(':')[1], 10);
    const endHour = parseInt(available_end.split(':')[0], 10);
    const endMinute = parseInt(available_end.split(':')[1], 10);
    const interval = parseInt(booking_interval_minutes);

    for (const weekday of selectedWeekdays) {
      let start = new Date();
      start.setHours(startHour, startMinute, 0, 0);
      const end = new Date();
      end.setHours(endHour, endMinute, 0, 0);

      while (start < end) {
        const slotStart = new Date(start);
        const slotEnd = new Date(start);
        slotEnd.setMinutes(slotEnd.getMinutes() + interval);

        const h = String(start.getHours()).padStart(2, '0');
        const m = String(start.getMinutes()).padStart(2, '0');
        slotInserts.push({
          resource_id: resourceData.id,
          weekday,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          capacity: Number(total_spots),
          time_label: `${h}:${m}`,
        });
        start.setMinutes(start.getMinutes() + interval);
      }
    }

    const { error: slotError } = await supabase
      .from('resource_time_slots')
      .insert(slotInserts);

    if (slotError) {
      console.error('Slot generation error:', slotError.message);
    }

    setForm({
      name: '',
      type_id: '',
      location: '',
      total_spots: '',
      available_start: '',
      available_end: '',
      booking_interval_minutes: '',
      selectedWeekdays: [],
    });

    fetchResources();
  };

  const toggleWeekday = (day) => {
    setForm((prev) => {
      const exists = prev.selectedWeekdays.includes(day);
      return {
        ...prev,
        selectedWeekdays: exists
          ? prev.selectedWeekdays.filter((d) => d !== day)
          : [...prev.selectedWeekdays, day],
      };
    });
  };

  const handleAddType = async () => {
    setTypeError('');
    if (!newType.trim()) return;

    const { error } = await supabase
      .from('resource_types')
      .insert([{ name: newType.trim(), building_id: buildingId }]);

    if (error) {
      setTypeError('Failed to add resource type.');
    } else {
      setNewType('');
      fetchResourceTypes();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (!error) fetchResources();
  };

  const handleToggleActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('resources')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) fetchResources();
  };

  function generateTimeOptions(start = 0, end = 24, step = 30) {
    const options = [];
    for (let minutes = start * 60; minutes < end * 60; minutes += step) {
      const h = String(Math.floor(minutes / 60)).padStart(2, '0');
      const m = String(minutes % 60).padStart(2, '0');
      options.push(`${h}:${m}`);
    }
    return options;
  }

  const timeOptions = generateTimeOptions();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Resources for {building?.name || 'Building'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <input
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Resource Name"
          required
          className="w-full p-2 border rounded"
        />
        <select
          name="type_id"
          value={form.type_id}
          onChange={(e) => setForm({ ...form, type_id: e.target.value })}
          required
          className="w-full p-2 border rounded"
        >
          <option value="">Select Type</option>
          {resourceTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          name="location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Location Description"
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          name="total_spots"
          value={form.total_spots}
          onChange={(e) => setForm({ ...form, total_spots: e.target.value })}
          placeholder="Total Spots"
          required
          className="w-full p-2 border rounded"
        />

        <div className="flex gap-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleWeekday(i)}
              className={`px-3 py-1 rounded border ${form.selectedWeekdays.includes(i) ? 'bg-indigo-600 text-white' : 'bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          name="available_start"
          value={form.available_start}
          onChange={(e) =>
            setForm({ ...form, available_start: e.target.value })
          }
          required
          className="w-full p-2 border rounded"
        >
          <option value="">Start Time</option>
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          name="available_end"
          value={form.available_end}
          onChange={(e) => setForm({ ...form, available_end: e.target.value })}
          required
          className="w-full p-2 border rounded"
        >
          <option value="">End Time</option>
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          name="booking_interval_minutes"
          value={form.booking_interval_minutes}
          onChange={(e) =>
            setForm({ ...form, booking_interval_minutes: e.target.value })
          }
          required
          className="w-full p-2 border rounded"
        >
          <option value="">Select Booking Interval</option>
          {[15, 30, 45, 60, 90, 120].map((interval) => (
            <option key={interval} value={interval}>
              {interval} minutes
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Resource
        </button>
      </form>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Add New Resource Type</h2>
        <div className="flex space-x-2">
          <input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Gym, swimming pool, parking spots, etc"
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleAddType}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Add Type
          </button>
        </div>
        {typeError && <p className="text-red-600 mt-2">{typeError}</p>}
      </div>

      <h2 className="text-lg font-semibold mb-4">Existing Resources</h2>
      <ul className="space-y-2">
        {resources.map((r) => (
          <li key={r.id} className="p-4 border rounded bg-white shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p>
                  <strong>{r.name}</strong> (
                  {r.resource_types?.name || 'Unknown'})
                </p>
                <p className="text-sm text-gray-600">
                  Location: {r.location_description}
                </p>
                <p className="text-sm">
                  Available: {r.available_start} - {r.available_end}
                  <br />
                  Interval: {r.booking_interval_minutes} min
                  <br />
                  Days:{' '}
                  {r.resource_availability?.length > 0
                    ? r.resource_availability
                        .map(
                          (a) =>
                            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                              a.weekday
                            ]
                        )
                        .join(', ')
                    : 'Not set'}
                </p>
              </div>
              <div className="space-x-3">
                <button
                  onClick={() => handleToggleActive(r.id, r.is_active)}
                  className={
                    r.is_active
                      ? 'text-yellow-600 hover:underline'
                      : 'text-green-600 hover:underline'
                  }
                >
                  {r.is_active ? 'Mark as Inactive' : 'Reactivate'}
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
