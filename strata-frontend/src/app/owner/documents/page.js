'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function ViewDocumentsPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [documents, setDocuments] = useState([]);
  const [buildingName, setBuildingName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('building_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.building_id) {
      console.error('Failed to fetch user building:', profileError);
      setLoading(false);
      return;
    }

    const { data: buildingData } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', profile.building_id)
      .single();

    setBuildingName(buildingData?.name || '');

    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('building_id', profile.building_id)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching documents:', docsError);
    } else {
      setDocuments(docs);
    }

    setLoading(false);
  };

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Documents for {buildingName || 'your building'}
      </h1>

      {documents.length === 0 ? (
        <p className="text-gray-500">No documents available.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="border p-4 rounded bg-white shadow-sm">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold underline"
              >
                {doc.title}
              </a>
              <p className="text-sm text-gray-500">Category: {doc.category}</p>
              <p className="text-xs text-gray-400">
                Uploaded: {new Date(doc.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
