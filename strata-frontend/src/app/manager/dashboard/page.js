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
    const fetchData = async () => {
      if (!session?.user) return;
      const { data: bldData, error: bldErr } = await supabase
        .from('manager_buildings')
        .select('buildings!manager_buildings_building_id_fkey(name,id)')
        .eq('user_id', session.user.id);
      if (!bldErr) setBuildings(bldData.map((r) => r.buildings));
      const ids = bldData?.map((r) => r.buildings.id) || [];

      if (ids.length) {
        const [{ data: pend = [], error: pendErr }, { data: comp = [], error: compErr }] = await Promise.all([
          supabase.from('maintenance_requests').select('*').in('building_id', ids).eq('status', 'pending'),
          supabase.from('maintenance_requests').select('*').in('building_id', ids).eq('status', 'completed')
        ]);
        if (!pendErr) setPendingRequests(pend);
        if (!compErr) setCompletedRequests(comp);
      }
      setLoading(false);
    };
    fetchData();
  }, [session]);

  const confirmRequest = async (id) => {
    const updated_at = new Date().toISOString();
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'completed', updated_at })
      .eq('id', id);
    if (!error) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      const req = pendingRequests.find((r) => r.id === id);
      setCompletedRequests((prev) => [{ ...req, updated_at }, ...prev]);
    }
  };

  if (!session) return <p className="p-6 text-text">Loading session...</p>;
  if (loading) return <p className="p-6 text-text">Loading data...</p>;

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      {/* full-width canvas, but with 16 rem left padding on ≥1024 px */}
      <div className="fixed inset-y-0 right-0 lg:left-64 bg-background overflow-x-hidden">
        {/* keep some breathing-room, but not enough to cause overflow */}
        <div className="px-6 py-8 space-y-12">

          {/* HEADER ----------------------------------------------------- */}
          <header>
            <h1 className="text-4xl font-bold text-text mb-2">
              Your Dashboard
            </h1>
            <p className="text-gray-600">
              Overview of your buildings and maintenance requests.
            </p>
          </header>

          {/* BUILDINGS -------------------------------------------------- */}
          <section>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Your Buildings
            </h2>

            {buildings.length === 0 ? (
              <p className="text-gray-500">No buildings assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {buildings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border-l-4 border-primary rounded-lg shadow p-6 min-w-0"
                  >
                    <h3 className="text-xl font-medium truncate">{b.name}</h3>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* QUICK TOOLS ------------------------------------------------ */}
          <section>
            <h2 className="text-2xl font-semibold text-text mb-4">Quick Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { href: '/manager/invite', label: 'Invite Users' },
                { href: '/manager/select-building?next=resources', label: 'Manage Resources' },
                { href: '/manager/select-building?next=documents', label: 'Upload Documents' },
                { href: '/manager/select-building?next=announcements', label: 'Create Announcements' },
              ].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="block bg-white text-text rounded-lg shadow p-6 text-center hover:bg-secondary transition"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </section>

          {/* PENDING REQUESTS ------------------------------------------ */}
          <section>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Pending Maintenance Requests
            </h2>

            {pendingRequests.length === 0 ? (
              <p className="text-gray-500">No pending requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col justify-between bg-red-500 rounded-lg shadow p-6 border-l-4 border-secondary min-w-0"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-text">{r.title}</h3>
                      <p className="text-sm text-gray-700 mt-2">{r.description}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-gray-200">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => confirmRequest(r.id)}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* COMPLETED REQUESTS ---------------------------------------- */}
          <section>
            <h2 className="text-2xl font-semibold text-text mb-4">
              Completed Maintenance Requests
            </h2>

            {completedRequests.length === 0 ? (
              <p className="text-gray-500">No completed requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedRequests.map((r) => (
                  <div
                    key={r.id}
                    className="bg-green-300 rounded-lg shadow p-6 border-l-4 border-accent min-w-0"
                  >
                    <h3 className="text-lg font-medium text-text">{r.title}</h3>
                    <p className="text-sm text-gray-700 mt-2">{r.description}</p>
                    <p className="text-xs text-gray-600 mt-4">
                      Completed:&nbsp;
                      {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}