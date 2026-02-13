'use client';

import { createContext, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import GlobalHeader from '@/components/GlobalHeader';
import { Spinner } from '@/components/ui/spinner';
import {
  HeaderActionsProvider,
  useHeaderActions,
} from '@/context/HeaderActionsContext';

import { TERMS_VERSION } from '@/lib/terms';

export const BuildingContext = createContext(null);

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

function TermsGate({ children }) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      setChecking(true);

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // If somehow not authed, let ProtectedRoute handle it
      if (!user) {
        setChecking(false);
        return;
      }

      const { data: row, error } = await supabase
        .from('terms_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();

      if (!error && !row?.id) {
        router.replace(
          `/accept-terms?returnTo=${encodeURIComponent(pathname)}`
        );
        return;
      }

      setChecking(false);
    };

    run();
  }, [supabase, router, pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-primary">
        <div
          className="flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <Spinner className="h-5 w-5" />
          <span className="text-sm font-medium">Checking terms…</span>
        </div>
      </div>
    );
  }

  return children;
}

export default function BuildingLayout({ children }) {
  const supabase = useSupabaseClient();
  const { id: raw } = useParams();
  const id = Array.isArray(raw) ? raw[0] : raw;
  const value = useMemo(() => ({ buildingId: id, supabase }), [id, supabase]);

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <TermsGate>
        <HeaderActionsProvider>
          <BuildingContext.Provider value={value}>
            <NavBar />
            <div className="manager-shell min-w-0 w-full md:pl-20">
              <HeaderFromContext />
              <main className="min-h-screen bg-background transition-colors duration-500 ease-in-out w-full max-w-none overflow-x-hidden pt-20 px-6">
                {children}
              </main>
            </div>
          </BuildingContext.Provider>
        </HeaderActionsProvider>
      </TermsGate>
    </ProtectedRoute>
  );
}
