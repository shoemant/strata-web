'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export const UserContext = createContext();

export const useUserContext = () => useContext(UserContext);

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function UserContextProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [buildings, setBuildings] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const getSessionInfo = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setUser(null);
                setRole(null);
                setBuildings([]);
                return;
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role, building_id')
                .eq('id', user.id)
                .single();

            setUser(user);
            setRole(profile?.role || null);

            if (profile?.building_id) {
                const { data: buildings } = await supabase
                    .from('buildings')
                    .select('*')
                    .in('id', [profile.building_id]);
                setBuildings(buildings || []);
            }
        };

        getSessionInfo();

        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            getSessionInfo();
            router.refresh(); // Optional: refreshes server components if needed
        });

        return () => {
            listener?.subscription.unsubscribe();
        };
    }, []);

    return (
        <UserContext.Provider value={{ user, role, buildings }}>
            {children}
        </UserContext.Provider>
    );
}
