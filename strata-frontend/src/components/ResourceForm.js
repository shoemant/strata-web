'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function ResourceForm({ initial = {}, onSave, buildingId }) {
    const supabase = useSupabaseClient();

    /* ------------------------------------------------------------------
       resource values
    ------------------------------------------------------------------ */
    const [values, setValues] = useState({
        name: '',
        type_id: '',
        location_description: '',
        total_spots: 1,
        available_start: '08:00',
        available_end: '22:00',
        booking_interval_minutes: 60,
        max_slots_per_user_per_day: 2,
        is_active: true,
        ...initial,
    });

    /* ------------------------------------------------------------------
       resource-type dropdown + fetch
    ------------------------------------------------------------------ */
    const [types, setTypes] = useState([]);
    const fetchTypes = async () => {
        const { data, error } = await supabase
            .from('resource_types')
            .select('id,name,building_id')
            .or(`building_id.eq.${buildingId},building_id.is.null`)
            .order('id');
        if (error) console.error(error);
        setTypes(data || []);
    };

    useEffect(() => {
        if (buildingId) fetchTypes();
    }, [buildingId]);

    /* ------------------------------------------------------------------
       quick-add type form
    ------------------------------------------------------------------ */
    const [addingType, setAddingType] = useState(false);
    const [newType, setNewType] = useState({
        name: '',
        description: '',
        max_slots_per_user_per_day: 2,
    });

    const saveNewType = async e => {
        e.preventDefault();
        if (!newType.name.trim()) return alert('Type name is required');

        const { data, error } = await supabase
            .from('resource_types')
            .insert([
                {
                    ...newType,
                    max_slots_per_user_per_day: Number(
                        newType.max_slots_per_user_per_day,
                    ),
                    building_id: buildingId,
                },
            ])
            .select('id')
            .single();

        if (error) return alert(error.message);

        // refresh list & auto-select new type
        await fetchTypes();
        setValues(v => ({ ...v, type_id: data.id }));
        setNewType({ name: '', description: '', max_slots_per_user_per_day: 2 });
        setAddingType(false);
    };

    /* ------------------------------------------------------------------ */
    const handleChange = e =>
        setValues({ ...values, [e.target.name]: e.target.value });

    const handleSubmit = e => {
        e.preventDefault();
        onSave({
            ...values,
            total_spots: Number(values.total_spots),
            booking_interval_minutes: Number(values.booking_interval_minutes),
            max_slots_per_user_per_day: values.max_slots_per_user_per_day
                ? Number(values.max_slots_per_user_per_day)
                : null,
            is_active: Boolean(values.is_active),
        });
    };

    /* ------------------------------------------------------------------ */
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* basics ------------------------------------------------------- */}
            <div className="grid gap-4 md:grid-cols-2">
                <input
                    name="name"
                    placeholder="Resource name (e.g. Gym)"
                    value={values.name}
                    onChange={handleChange}
                    className="p-2 border rounded"
                    required
                />

                <div className="flex gap-2">
                    <select
                        name="type_id"
                        value={values.type_id}
                        onChange={handleChange}
                        className="p-2 border rounded flex-1"
                        required
                    >
                        <option value="">Choose type…</option>
                        {types.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                                {t.building_id ? '' : ' (global)'}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => setAddingType(!addingType)}
                        className="px-2 rounded border"
                        title="Add new type"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* inline add-type form ---------------------------------------- */}
            {addingType && (
                <div className="p-4 border rounded-md space-y-3 bg-gray-50">
                    <h3 className="font-medium">New resource type</h3>
                    <input
                        placeholder="Name"
                        className="p-2 border rounded w-full"
                        value={newType.name}
                        onChange={e =>
                            setNewType({ ...newType, name: e.target.value })
                        }
                        required
                    />
                    <textarea
                        placeholder="Description (optional)"
                        className="p-2 border rounded w-full min-h-[70px]"
                        value={newType.description}
                        onChange={e =>
                            setNewType({ ...newType, description: e.target.value })
                        }
                    />
                    <h3 className="font-small">Daily slots per user</h3>
                    <input
                        type="number"
                        min="1"
                        placeholder="Daily slots per user (default 2)"
                        className="p-2 border rounded w-full"
                        value={newType.max_slots_per_user_per_day}
                        onChange={e =>
                            setNewType({
                                ...newType,
                                max_slots_per_user_per_day: e.target.value,
                            })
                        }
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={saveNewType}
                            className="px-4 py-1 bg-blue-600 text-white rounded"
                        >
                            Save type
                        </button>
                        <button
                            type="button"
                            onClick={() => setAddingType(false)}
                            className="px-4 py-1 border rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* capacity & limits ------------------------------------------- */}
            <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                    <span className="text-sm">Total spots</span>
                    <input
                        type="number"
                        name="total_spots"
                        min="1"
                        value={values.total_spots}
                        onChange={handleChange}
                        className="p-2 border rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span className="text-sm">Slot length (min)</span>
                    <input
                        type="number"
                        name="booking_interval_minutes"
                        min="5"
                        step="5"
                        value={values.booking_interval_minutes}
                        onChange={handleChange}
                        className="p-2 border rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span className="text-sm">Daily slots / user</span>
                    <input
                        type="number"
                        name="max_slots_per_user_per_day"
                        min="1"
                        value={values.max_slots_per_user_per_day ?? ''}
                        onChange={handleChange}
                        className="p-2 border rounded w-full"
                    />
                </label>
            </div>

            {/* operating window -------------------------------------------- */}
            <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="text-sm">Opens at</span>
                    <input
                        type="time"
                        name="available_start"
                        value={values.available_start}
                        onChange={handleChange}
                        className="p-2 border rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span className="text-sm">Closes at</span>
                    <input
                        type="time"
                        name="available_end"
                        value={values.available_end}
                        onChange={handleChange}
                        className="p-2 border rounded w-full"
                        required
                    />
                </label>
            </div>

            {/* description & active flag ----------------------------------- */}
            <textarea
                name="location_description"
                placeholder="Location / notes"
                value={values.location_description}
                onChange={handleChange}
                className="p-2 border rounded w-full min-h-[80px]"
            />

            <label className="inline-flex items-center gap-2">
                <input
                    type="checkbox"
                    name="is_active"
                    checked={values.is_active}
                    onChange={e =>
                        setValues({ ...values, is_active: e.target.checked })
                    }
                />
                <span>Active</span>
            </label>

            <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white"
            >
                Save resource
            </button>
        </form>
    );
}
