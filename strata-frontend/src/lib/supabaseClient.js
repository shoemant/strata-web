'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Navbar() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, { session }) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="p-4 bg-white shadow">
      {session ? (
        <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
      ) : (
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        >
          Sign In
        </button>
      )}
    </nav>
  );
}
