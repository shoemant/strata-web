/**
 * Register.jsx
 * 
 * This component handles user registration using both:
 * - Email/password sign-up with role and full name
 * - OAuth sign-up via Google and Apple
 * 
 * User data (full_name, role) is stored in `user_metadata` via Supabase.
 * On successful registration, the user is prompted to confirm their email and then redirected.
 * 
 * Dependencies:
 * - Supabase JS client
 * - React Router (`useNavigate`)
 */

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'tenant'
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Handle form input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle email/password registration
  const handleRegister = async () => {
    const { full_name, email, password, role } = form;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role }
      }
    });

    if (error) {
      setErrorMessage('Registration failed: ' + error.message);
    } else {
      alert('Check your email to confirm your account.');
      navigate('/');
    }
  };

  // Handle social OAuth registration
  const handleOAuthSignUp = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) {
      console.error(`OAuth (${provider}) error:`, error.message);
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
        <h2 style={{ marginBottom: '1.5rem', color: '#000' }}>Register</h2>

        {/* Error message if registration fails */}
        {errorMessage && (
          <p style={{ color: 'red', marginBottom: '1rem' }}>{errorMessage}</p>
        )}

        {/* Full Name input */}
        <input
          name="full_name"
          placeholder="Full Name"
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />

        {/* Email input */}
        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
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
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />

        {/* Role dropdown */}
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        >
          <option value="tenant">Tenant</option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
        </select>

        {/* Register button */}
        <button
          onClick={handleRegister}
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
          Register
        </button>

        {/* OAuth buttons */}
        <button
          onClick={() => handleOAuthSignUp('google')}
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
          onClick={() => handleOAuthSignUp('apple')}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Continue with Apple
        </button>
      </div>
    </div>
  );
}
