// app/manager/buildings/[id]/layout.js
'use client';

import { createContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export const BuildingContext = createContext(null);

export default function BuildingLayout({ children }) {
    const supabase = useSupabaseClient();
    const { id: raw } = useParams();
    const id = Array.isArray(raw) ? raw[0] : raw;

    // You can preload core building info here (or keep it in each page).
    // Keeping super lightweight: just pass the id down via context.
    const value = useMemo(() => ({ buildingId: id, supabase }), [id, supabase]);

    return (
        <ProtectedRoute allowedRoles={['manager']}>
            <BuildingContext.Provider value={value}>
                {children}
            </BuildingContext.Provider>
        </ProtectedRoute>
    );
}
