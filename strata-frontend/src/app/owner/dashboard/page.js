'use client';

import Link from 'next/link';

export default function OwnerDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Owner Dashboard</h1>
      <div className="space-y-4">
        <Link
          href="/owner/documents"
          className="block p-4 bg-white rounded shadow hover:bg-gray-50"
        >
          View Documents
        </Link>
        <Link
          href="/owner/announcements"
          className="block p-4 bg-white rounded shadow hover:bg-gray-50"
        >
          View Announcements
        </Link>
        <Link
          href="/owner/maintenance"
          className="block p-4 bg-white rounded shadow hover:bg-gray-50"
        >
          Submit Maintenance Request
        </Link>
      </div>
    </div>
  );
}
