'use client'

import { createContext, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import NavBar from '@/components/NavBar'
import GlobalHeader from '@/components/GlobalHeader'
import { HeaderActionsProvider, useHeaderActions } from '@/context/HeaderActionsContext'

export const BuildingContext = createContext(null)

function HeaderFromContext() {
    // Tiny bridge component that pulls slots/title from context and feeds GlobalHeader
    const { rightSlot, leftSlot, title } = useHeaderActions()
    return <GlobalHeader rightSlot={rightSlot} leftSlot={leftSlot} title={title || undefined} />
}

export default function BuildingLayout({ children }) {
    const supabase = useSupabaseClient()
    const { id: raw } = useParams()
    const id = Array.isArray(raw) ? raw[0] : raw

    const value = useMemo(() => ({ buildingId: id, supabase }), [id, supabase])

    return (
        <ProtectedRoute allowedRoles={['manager']}>
            <HeaderActionsProvider>
                <BuildingContext.Provider value={value}>
                    <NavBar />
                    <HeaderFromContext />
                    <main className="min-h-screen bg-background transition-colors duration-500 ease-in-out">
                        {children}
                    </main>
                </BuildingContext.Provider>
            </HeaderActionsProvider>
        </ProtectedRoute>
    )
}
