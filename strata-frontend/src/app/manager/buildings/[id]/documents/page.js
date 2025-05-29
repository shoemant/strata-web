'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export default function DocumentsPage() {
  const { id: buildingId } = useParams();
  console.log('Building ID:', buildingId); // Add this line
  const supabase = useSupabaseClient();
  const session = useSession();
  const [building, setBuilding] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!buildingId) return;

    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching documents:', error);
      else setDocuments(data);
    };

    const fetchBuildings = async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', buildingId)
        .single();
      if (error) {
        console.error('Error fetching building name:', error);
      } else {
        setBuilding(data);
      }
    };

    fetchBuildings();
    fetchDocuments();
  }, [buildingId, supabase]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !category || !session?.user) return;

    setLoading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${buildingId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setLoading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(filePath);

    console.log('Submitting metadata:', {
      title,
      category,
      url: publicUrl,
      uploaded_by: session.user.id,
      building_id: buildingId,
    });

    const { data, error } = await supabase.from('documents').insert([
      {
        title,
        category,
        url: publicUrl,
        uploaded_by: session.user.id,
        building_id: buildingId,
      },
    ]);

    if (error) {
      console.error('Insert error:', error);
      setLoading(false);
      return;
    }

    setDocuments((prev) => [data[0], ...prev]);

    // Reset form
    setTitle('');
    setCategory('');
    setFile(null);
    document.getElementById('fileInput').value = '';
    setLoading(false);
  };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Documents for {building?.name || 'Building'}
      </h1>

      <form onSubmit={handleUpload} className="space-y-4 mb-8">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Category (e.g., bylaws, minutes)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="block w-full p-2 border rounded"
          required
        />
        <input
          type="file"
          id="fileInput"
          onChange={(e) => setFile(e.target.files[0])}
          className="block"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Uploaded Documents</h2>
      {documents.length === 0 ? (
        <p className="text-gray-500">No documents found.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="p-4 border rounded bg-white shadow-sm">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {doc.title}
              </a>
              <p className="text-sm text-gray-600">Category: {doc.category}</p>
              <p className="text-sm text-gray-400">
                Uploaded: {new Date(doc.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
