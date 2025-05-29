'use client';

import { useEffect, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

export default function ManagerDashboard() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [buildings, setBuildings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuildingsAndRequests = async () => {
      if (!session?.user) return;

      const { data: buildingData, error: buildingError } = await supabase
        .from('manager_buildings')
        .select(
          'building_id, buildings!manager_buildings_building_id_fkey(name, id)'
        )
        .eq('user_id', session.user.id);

      if (buildingError) {
        console.error('Error fetching buildings:', buildingError);
        setLoading(false);
        return;
      }

      const fetchedBuildings = buildingData.map((b) => b.buildings);
      setBuildings(fetchedBuildings);

      if (fetchedBuildings.length > 0) {
        const buildingIds = fetchedBuildings.map((b) => b.id);

        const { data: pendingData, error: pendingError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .in('building_id', buildingIds)
          .eq('status', 'pending');

        if (pendingError) {
          console.error('Error fetching pending requests:', pendingError);
        } else {
          setPendingRequests(pendingData);
        }

        const { data: completedData, error: completedError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .in('building_id', buildingIds)
          .eq('status', 'completed');

        if (completedError) {
          console.error('Error fetching completed requests:', completedError);
        } else {
          setCompletedRequests(completedData);
        }
      }

      setLoading(false);
    };

    fetchBuildingsAndRequests();
  }, [session]);

  const handleConfirmRequest = async (requestId) => {
    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'completed', updated_at: updatedAt })
      .eq('id', requestId);

    if (error) {
      console.error('Error confirming request:', error);
      return;
    }

    const confirmed = pendingRequests.find((r) => r.id === requestId);
    confirmed.updated_at = updatedAt;

    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    setCompletedRequests((prev) => [confirmed, ...prev]);
  };

  if (!session) return <p>Loading session...</p>;
  if (loading) return <p>Loading buildings...</p>;

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Manager Dashboard</h1>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Managed Buildings</h2>
          {buildings.length === 0 ? (
            <p className="text-gray-500">No buildings assigned yet.</p>
          ) : (
            <ul className="space-y-4">
              {buildings.map((building) => (
                <li
                  key={building.id}
                  className="border p-4 rounded shadow-sm bg-white"
                >
                  <h3 className="text-xl font-semibold">{building.name}</h3>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Quick Tools</h2>
          <div className="flex flex-wrap gap-4">
            <a
              href="/manager/invite"
              className="bg-blue-600 text-white px-4 py-2 rounded shadow"
            >
              Invite Users
            </a>
            <a
              href="/manager/select-building?next=resources"
              className="bg-green-600 text-white px-4 py-2 rounded shadow"
            >
              Manage Resources
            </a>
            <a
              href="/manager/select-building?next=documents"
              className="bg-purple-600 text-white px-4 py-2 rounded shadow"
            >
              Upload Documents
            </a>
            <a
              href="/manager/select-building?next=announcements"
              className="bg-yellow-600 text-white px-4 py-2 rounded shadow"
            >
              Create Announcements
            </a>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">
            Pending Maintenance Requests
          </h2>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500">No pending requests.</p>
          ) : (
            <ul className="space-y-4">
              {pendingRequests.map((req) => (
                <li
                  key={req.id}
                  className="border p-4 rounded shadow-sm bg-white"
                >
                  <h4 className="text-md font-semibold">{req.title}</h4>
                  <p className="text-sm text-gray-600">{req.description}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted: {new Date(req.submitted_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleConfirmRequest(req.id)}
                    className="mt-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Confirm
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">
            Completed Maintenance Requests
          </h2>
          {completedRequests.length === 0 ? (
            <p className="text-gray-500">No completed requests.</p>
          ) : (
            <ul className="space-y-4">
              {completedRequests.map((req) => (
                <li
                  key={req.id}
                  className="border p-4 rounded shadow-sm bg-gray-100"
                >
                  <h4 className="text-md font-semibold">{req.title}</h4>
                  <p className="text-sm text-gray-600">{req.description}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Completed: {new Date(req.updated_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
