import "@/styles/globals.css"
import { createServerClient } from "@supabase/ssr"
import { cookies as getCookies } from "next/headers"
import ClientWrapper from "./client-wrapper"
import NavBar from "@/components/NavBar"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: "Strata Management App",
  description: "Manage your building with ease",
}

export default async function RootLayout({ children }) {
  const cookieStore = await getCookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role = null
  let buildings = []

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, building_id")
      .eq("id", user.id)
      .single()

    role = profile?.role ?? null

    if (role === "manager") {
      const { data: managerBuildings } = await supabase
        .from("manager_buildings")
        .select("building_id, buildings(name, id)")
        .eq("user_id", user.id)

      buildings = (managerBuildings || [])
        .map((row) => row?.buildings)
        .filter(Boolean)
    } else if ((role === "tenant" || role === "owner") && profile?.building_id) {
      const { data: b } = await supabase
        .from("buildings")
        .select("id, name")
        .eq("id", profile.building_id)
        .single()
      if (b) buildings = [b]
    }
  }

  const showNav = Boolean(user && role)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex">
        <ThemeProvider>
          <ClientWrapper user={user} role={role} buildings={buildings}>
            <div className="flex w-full">
              {showNav && <NavBar />}
              <main className={showNav ? "flex-1 ml-20" : "flex-1"}>
                {children}
              </main>
            </div>
          </ClientWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
