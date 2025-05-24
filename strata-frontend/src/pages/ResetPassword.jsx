/**
 * ResetPassword.jsx
 * 
 * This component allows users to request a password reset email via Supabase Auth.
 * 
 * Features:
 * - Collects user's email
 * - Sends a password reset link using Supabase
 * - Displays success or error message after submission
 * 
 * Dependencies:
 * - Supabase JS client
 * 
 * Supabase must have "Site URL" and redirect settings configured correctly in the Auth dashboard
 * (e.g., `https://your-app.com/update-password`)
 */

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Handles password reset request
  const handleReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your inbox for the reset link.');
    }
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
        <h2 style={{ marginBottom: '1.5rem', color: '#000' }}>Reset Password</h2>

        {/* Email input field */}
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleReset}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Send Reset Link
        </button>

        {/* Success/Error Message */}
        {message && (
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.9rem',
              color: message.startsWith('Error') ? 'red' : 'green'
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
