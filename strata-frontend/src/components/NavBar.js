'use client';

import Link from 'next/link';
import { useUserContext } from '@/context/UserContextProvider'; // ✅ correct
import LogoutButton from './LogoutButton';

export default function NavBar() {
  const { role, buildings, user } = useUserContext();

  if (!user || !role) return null;

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <div className="flex gap-6 items-center flex-wrap">
        {role === 'manager' && (
          <>
            <Link href="/manager/profile"><span className="hover:underline">Profile</span></Link>
            <Link href="/manager/dashboard"><span className="hover:underline">Dashboard</span></Link>
            <Link href="/manager/invite"><span className="hover:underline">Invite Users</span></Link>
            <Link href="/manager/select-building?next=announcements"><span className="hover:underline">Announcements</span></Link>
            {buildings.map((b) => (
              <div key={b.id} className="ml-4">
                <p className="text-sm font-semibold text-gray-300">{b.name}</p>
                <div className="flex gap-3 text-sm text-blue-400">
                  <Link href={`/manager/buildings/${b.id}/documents`}>Documents</Link>
                  <Link href={`/manager/buildings/${b.id}/resources`}>Resources</Link>
                </div>
              </div>
            ))}
          </>
        )}

        {role === 'admin' && (
          <Link href="/admin/add-building"><span className="hover:underline">Add Building</span></Link>
        )}

        {role === 'owner' && (
          <>
            <Link href="/owner/profile"><span className="hover:underline">Profile</span></Link>
            <Link href="/owner/dashboard"><span className="hover:underline">Dashboard</span></Link>
            <Link href="/owner/invite-tenant"><span className="hover:underline">Invite Tenants</span></Link>
            <Link href="/owner/documents"><span className="hover:underline">Documents</span></Link>
            <Link href="/owner/announcements"><span className="hover:underline">Announcements</span></Link>
            <Link href="/owner/maintenance"><span className="hover:underline">Maintenance</span></Link>
            <Link href="/owner/resources"><span className="hover:underline">Book Resources</span></Link>
          </>
        )}
      </div>
      <LogoutButton />
    </nav>
  );
}
