import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ManageResources() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [buildingId, setBuildingId] = useState('');

  const handleAdd = async () => {
    const { error } = await supabase.from('resources').insert([{ name, description, building_id: buildingId }]);
    if (error) alert(error.message);
    else alert('Resource added!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add New Resource</h1>
      <input placeholder="Resource Name" value={name} onChange={e => setName(e.target.value)} className="block mb-2" />
      <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="block mb-2" />
      <input placeholder="Building ID" value={buildingId} onChange={e => setBuildingId(e.target.value)} className="block mb-4" />
      <button onClick={handleAdd}>Add Resource</button>
    </div>
  );
}
