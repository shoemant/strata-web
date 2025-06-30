'use client';
import { useState } from 'react';

export default function ResourceTypeForm({ initial = {}, onSave }) {
    const [values, setValues] = useState({
        name: '',
        description: '',
        max_slots_per_user_per_day: 2,
        ...initial,
    });

    const handleChange = e =>
        setValues({ ...values, [e.target.name]: e.target.value });

    const handleSubmit = e => {
        e.preventDefault();
        onSave({
            ...values,
            max_slots_per_user_per_day: Number(values.max_slots_per_user_per_day),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                name="name"
                placeholder="Type name (e.g. ‘Amenity’)"
                value={values.name}
                onChange={handleChange}
                className="p-2 border rounded w-full"
                required
            />
            <textarea
                name="description"
                placeholder="Description (optional)"
                value={values.description}
                onChange={handleChange}
                className="p-2 border rounded w-full min-h-[80px]"
            />
            <label className="block">
                <span className="text-sm">Daily slots / user (default)</span>
                <input
                    type="number"
                    name="max_slots_per_user_per_day"
                    min="1"
                    value={values.max_slots_per_user_per_day}
                    onChange={handleChange}
                    className="p-2 border rounded w-full"
                />
            </label>
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </form>
    );
}
