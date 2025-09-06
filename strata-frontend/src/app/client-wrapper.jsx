'use client';

import SupabaseProvider from '@/components/SupabaseProvider';
import { UserContextProvider } from '@/context/UserContextProvider'; // 🔄 new dynamic provider
import NavBar from '@/components/NavBar';

export default function ClientWrapper({ children }) {
  return (
    <SupabaseProvider>
      <UserContextProvider>
        <NavBar />
        <main className="p-4">{children}</main>
      </UserContextProvider>
    </SupabaseProvider>
  );
}
