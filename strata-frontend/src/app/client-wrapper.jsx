"use client"

import SupabaseProvider from "@/components/SupabaseProvider"
import { UserContextProvider } from "@/context/UserContextProvider"

export default function ClientWrapper({ children, user, role, buildings }) {
  return (
    <SupabaseProvider>
      <UserContextProvider user={user} role={role} buildings={buildings}>
        {children}
      </UserContextProvider>
    </SupabaseProvider>
  )
}
