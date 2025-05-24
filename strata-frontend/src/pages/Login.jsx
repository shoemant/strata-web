/**
 * Login.jsx
 * 
 * Login page for email/password authentication and social sign-in (Google, Apple) using Supabase.
 * 
 * Features:
 * - Users can sign in with email and password
 * - OAuth login via Google and Apple
 * - Redirects to `/dashboard` on success
 * - Error alerts on failed login
 * - Links to register and reset-password pages
 * 
 * Dependencies:
 * - Supabase JS client (frontend)
 * - React Router (`useNavigate`, `Link`)
 */

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Email/password login
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  // OAuth login with Google or Apple
  const handleOAuthLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) {
      console.error(`OAuth (${provider}) error:`, error.message);
      alert(`Login with ${provider} failed: ${error.message}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
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
        <h2 style={{ marginBottom: '1.5rem', color: '#000' }}>Login</h2>

        {/* Email input */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />

        {/* Password input */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />

        {/* Login button */}
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          Login
        </button>

        {/* Social login buttons */}
        <button
          onClick={() => handleOAuthLogin('google')}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#db4437',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuthLogin('apple')}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
        >
          Continue with Apple
        </button>

        {/* Navigation links */}
        <div style={{ fontSize: '0.9rem' }}>
          <Link to="/register" style={{ marginRight: '1rem', color: '#007bff', textDecoration: 'none' }}>
            Register
          </Link>
          <Link to="/reset-password" style={{ color: '#007bff', textDecoration: 'none' }}>
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}
