/**
 * Dashboard.jsx
 * 
 * Displays a simple authenticated dashboard view.
 * 
 * Features:
 * - Verifies the user is logged in via Supabase on mount
 * - Redirects to `/` (login) if user is not authenticated
 * - Displays the user's email and assigned role
 * - Provides a logout button that clears the session and redirects to login
 * 
 * Dependencies:
 * - `supabase` client from `lib/supabaseClient.js`
 * - `react-router-dom` for navigation
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        navigate('/');
        return;
      }

      setUser(user);
    };

    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f3f3f3'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#000' }}>Dashboard</h2>
        {user && (
          <>
            <p style={{ color: '#000', marginBottom: '0.5rem' }}>
              Welcome, {user.email}
            </p>
            <p style={{ color: '#000', marginBottom: '1.5rem' }}>
              Your role is: <strong>{user.user_metadata?.role}</strong>
            </p>
          </>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
