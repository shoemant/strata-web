'use client';

import SupabaseProvider from '@/components/SupabaseProvider';
import { UserContextProvider } from '@/context/UserContextProvider'; // 🔄 new dynamic provider
import NavBar from '@/components/NavBar';

export default function ClientWrapper({ children }) {
  return (
    <SupabaseProvider>
      <UserContextProvider>
        <NavBar />
        <main>{children}</main>
      </UserContextProvider>
    </SupabaseProvider>
  );
}
