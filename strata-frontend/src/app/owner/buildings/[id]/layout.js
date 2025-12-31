'use client';

import { createContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import GlobalHeader from '@/components/GlobalHeader';
import {
  HeaderActionsProvider,
  useHeaderActions,
} from '@/context/HeaderActionsContext';

export const OwnerBuildingContext = createContext(null);

function HeaderFromContext() {
  const { rightSlot, leftSlot, title } = useHeaderActions();
  return (
    <GlobalHeader
      rightSlot={rightSlot}
      leftSlot={leftSlot}
      title={title || undefined}
    />
  );
}

export default function OwnerBuildingLayout({ children }) {
  const supabase = useSupabaseClient();
  const { id: raw } = useParams();
  const id = Array.isArray(raw) ? raw[0] : raw;
  const value = useMemo(() => ({ buildingId: id, supabase }), [id, supabase]);

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <HeaderActionsProvider>
        <OwnerBuildingContext.Provider value={value}>
          <NavBar />
          <div className="owner-shell min-w-0 w-full pl-20">
            <HeaderFromContext />
            <main className="min-h-screen bg-background transition-colors duration-500 ease-in-out w-full max-w-none overflow-x-hidden">
              {children}
            </main>
          </div>
        </OwnerBuildingContext.Provider>
      </HeaderActionsProvider>
    </ProtectedRoute>
  );
}
