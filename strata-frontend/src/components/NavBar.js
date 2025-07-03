'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserContext } from '@/context/UserContextProvider';
import LogoutButton from './LogoutButton';

/* ---------- helpers ---------- */
const isActive = (pathname, href) =>
  pathname === href || pathname.startsWith(`${href}/`);

const itemClass = (active) =>
  [
    'block px-4 py-2 rounded transition',
    active
      ? 'bg-primary text-white'
      : 'hover:bg-primary hover:text-white',
  ].join(' ');

/* ---------- NavBar ---------- */
export default function NavBar() {
  const { role, buildings, user } = useUserContext();
  const pathname = usePathname();

  if (!user || !role) return null;

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-background text-text border-r border-accent flex flex-col p-6 space-y-4">
      {/* Logo / Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">StrataWeb</h1>
      </div>

      <ul className="flex-1 space-y-2">
        {/* MANAGER LINKS */}
        {role === 'manager' && (
          <>
            <li>
              <Link
                href="/manager/dashboard"
                className={itemClass(isActive(pathname, '/manager/dashboard'))}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/manager/profile"
                className={itemClass(isActive(pathname, '/manager/profile'))}
              >
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/manager/invite"
                className={itemClass(isActive(pathname, '/manager/invite'))}
              >
                Invite Users
              </Link>
            </li>
            <li>
              <Link
                href="/manager/select-building?next=announcements"
                className={itemClass(isActive(pathname, '/manager/select-building?next=announcements'))}
              >
                Announcements
              </Link>
            </li>

            {/* Buildings */}
            <li className="mt-4 pt-4 border-t border-accent text-sm uppercase text-gray-500">
              Buildings
            </li>
            {buildings.map((b) => (
              <li key={b.id} className="pl-2 space-y-1">
                <p className="text-sm font-semibold truncate">{b.name}</p>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href={`/manager/buildings/${b.id}/documents`}
                      className={itemClass(
                        isActive(pathname, `/manager/buildings/${b.id}/documents`)
                      )}
                    >
                      Documents
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/manager/buildings/${b.id}/resources`}
                      className={itemClass(
                        isActive(pathname, `/manager/buildings/${b.id}/resources`)
                      )}
                    >
                      Resources
                    </Link>
                  </li>
                </ul>
              </li>
            ))}
          </>
        )}

        {/* ADMIN LINKS */}
        {role === 'admin' && (
          <li>
            <Link
              href="/admin/add-building"
              className={itemClass(isActive(pathname, '/admin/add-building'))}
            >
              Add Building
            </Link>
          </li>
        )}

        {/* OWNER LINKS */}
        {role === 'owner' && (
          <>
            <li>
              <Link
                href="/owner/dashboard"
                className={itemClass(isActive(pathname, '/owner/dashboard'))}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/owner/profile"
                className={itemClass(isActive(pathname, '/owner/profile'))}
              >
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/owner/invite-tenant"
                className={itemClass(isActive(pathname, '/owner/invite-tenant'))}
              >
                Invite Tenants
              </Link>
            </li>
            <li>
              <Link
                href="/owner/resources"
                className={itemClass(isActive(pathname, '/owner/resources'))}
              >
                Book Resources
              </Link>
            </li>
            <li>
              <Link
                href="/owner/documents"
                className={itemClass(isActive(pathname, '/owner/documents'))}
              >
                Documents
              </Link>
            </li>
            <li>
              <Link
                href="/owner/announcements"
                className={itemClass(isActive(pathname, '/owner/announcements'))}
              >
                Announcements
              </Link>
            </li>
            <li>
              <Link
                href="/owner/maintenance"
                className={itemClass(isActive(pathname, '/owner/maintenance'))}
              >
                Maintenance
              </Link>
            </li>
          </>
        )}

        {/* TENANT LINKS */}
        {role === 'tenant' && (
          <>
            <li>
              <Link
                href="/tenant/dashboard"
                className={itemClass(isActive(pathname, '/tenant/dashboard'))}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/tenant/profile"
                className={itemClass(isActive(pathname, '/tenant/profile'))}
              >
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/tenant/resources"
                className={itemClass(isActive(pathname, '/tenant/resources'))}
              >
                Book Resources
              </Link>
            </li>
            <li>
              <Link
                href="/tenant/documents"
                className={itemClass(isActive(pathname, '/tenant/documents'))}
              >
                Documents
              </Link>
            </li>
            <li>
              <Link
                href="/tenant/announcements"
                className={itemClass(isActive(pathname, '/tenant/announcements'))}
              >
                Announcements
              </Link>
            </li>
          </>
        )}
      </ul>

      {/* Logout */}
      <div className="mt-auto">
        <LogoutButton className="w-full text-left px-4 py-2 rounded hover:bg-primary hover:text-white transition" />
      </div>
    </nav>
  );
}
