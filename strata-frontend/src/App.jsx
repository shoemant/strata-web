import { useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';

export default function App() {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session);
      if (event === 'SIGNED_OUT') {
        window.location.href = '/';
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
