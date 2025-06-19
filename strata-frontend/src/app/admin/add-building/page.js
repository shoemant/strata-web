'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export default function AddBuildingPage() {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [unitCount, setUnitCount] = useState(0);
    const [namingType, setNamingType] = useState('numeric'); // numeric | prefix | custom
    const [customLabels, setCustomLabels] = useState('');

    const handleSubmit = async () => {
        // Step 1: Create building
        const { data: building, error: buildingError } = await supabase
            .from('buildings')
            .insert({ name, address })
            .select()
            .single();

        if (buildingError) {
            alert('Error creating building');
            console.error(buildingError);
            return;
        }

        // Step 2: Generate units
        const units = [];
        if (namingType === 'numeric') {
            for (let i = 1; i <= unitCount; i++) {
                units.push({ label: `${i}`, unit_number: `${i}`, building_id: building.id });
            }
        } else if (namingType === 'prefix') {
            for (let i = 1; i <= unitCount; i++) {
                units.push({ label: `Unit ${i}`, unit_number: `${i}`, building_id: building.id });
            }
        } else if (namingType === 'custom') {
            const labels = customLabels.split(',').map((l) => l.trim());
            labels.forEach((label) => {
                units.push({ label, unit_number: label, building_id: building.id });
            });
        }

        const { error: unitError } = await supabase.from('units').insert(units);
        if (unitError) {
            alert('Error adding units');
            console.error(unitError);
            return;
        }

        // Step 3: Add manager pre-link by email
        const { error: inviteError } = await supabase.from('manager_buildings').insert([
            {
                email: managerEmail, // you'll need to add this column
                building_id: building.id,
            },
        ]);

        if (inviteError) {
            alert('Error assigning manager to building');
            console.error(inviteError);
            return;
        }

        alert('Building, units, and manager pre-invite added!');
    };


    return (
        <div className="p-4 max-w-xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Add Building</h2>
            <input
                placeholder="Building Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 mb-2 w-full"
            />
            <input
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border p-2 mb-2 w-full"
            />
            <input
                placeholder="Manager Email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="border p-2 mb-2 w-full"
            />

            <input
                type="number"
                placeholder="Number of Units"
                value={unitCount}
                onChange={(e) => setUnitCount(Number(e.target.value))}
                className="border p-2 mb-2 w-full"
            />

            <select
                value={namingType}
                onChange={(e) => setNamingType(e.target.value)}
                className="border p-2 mb-2 w-full"
            >
                <option value="numeric">Numeric (1, 2, 3...)</option>
                <option value="prefix">Prefix (Unit 1, Unit 2...)</option>
                <option value="custom">Custom (comma-separated)</option>
            </select>

            {namingType === 'custom' && (
                <textarea
                    placeholder="Custom labels (e.g. A1, A2, B1)"
                    value={customLabels}
                    onChange={(e) => setCustomLabels(e.target.value)}
                    className="border p-2 mb-2 w-full"
                />
            )}

            <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Create Building
            </button>
        </div>
    );
}
