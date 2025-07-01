'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import AuthLayout from '@/components/AuthLayout';
import { AnimatePresence, motion } from "framer-motion";

export default function LoginFlowPage() {
  const router = useRouter();
  const [step, setStep] = useState('email'); // email | password | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invite, setInvite] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back


  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailTrimmed = email.trim().toLowerCase();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      });

      const { exists, invite, error: backendError } = await res.json();
      if (backendError) return setError(backendError);

      setInvite(invite);
      setEmail(emailTrimmed);
      setStep(exists ? 'password' : 'signup');
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) return setError(loginError.message);

    router.push('/');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { data, error: signupError } = await supabase.auth.signUp({ email, password });

    if (signupError) return setError(signupError.message);

    router.push('/confirm-email');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetSent(false);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) return setError(resetError.message);

    setResetSent(true);
  };

  const stepOrder = ['email', 'password', 'signup', 'forgot'];
  const changeStep = (newStep) => {
    const currentIndex = stepOrder.indexOf(step);
    const nextIndex = stepOrder.indexOf(newStep);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setStep(newStep);
    setError('');
  };


  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-sm p-8 space-y-6"
          >
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold text-text">Welcome back!</h2>
              <p className="text-text">Enter your email to log in or register.</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="✉️ you@example.com"
                required
                className="w-full p-3 border border-accent rounded-md bg-white text-text focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition"
              >
                Next
              </button>
            </form>
          </motion.div>
        )}

        {step === 'password' && (
          <motion.div
            key="password"
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-sm p-8 space-y-6"
          >
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold text-text">Enter your password</h2>
              <p className="text-text">for <strong>{email}</strong></p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full p-3 border border-accent rounded-md bg-white text-text focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition"
              >
                Log In
              </button>
              <div className="flex justify-between text-sm text-primary">
                <button type="button" onClick={() => changeStep('email')} className="hover:underline">← Back</button>
                <button type="button" onClick={() => changeStep('forgot')} className="hover:underline">Forgot Password?</button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-sm p-8 space-y-6"
          >
            <form onSubmit={handleSignupSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold text-text">Create your account</h2>
              <p className="text-text">You’ve been invited as a <strong>{invite || 'user'}</strong></p>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-accent rounded bg-gray-100 text-gray-600"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full px-4 py-2 border border-accent rounded"
                required
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full py-2 bg-primary text-white rounded hover:bg-secondary transition"
              >
                Sign Up
              </button>
              <div className="text-sm text-primary text-center">
                <button type="button" onClick={() => changeStep('email')} className="hover:underline">← Back</button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-sm p-8 space-y-6"
          >
            <h2 className="text-2xl font-bold text-text">Reset Password</h2>
            {resetSent ? (
              <p className="text-green-600">Reset email sent to <strong>{email}</strong>!</p>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full p-3 border border-accent rounded bg-white"
                />
                <button
                  type="submit"
                  className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition"
                >
                  Send Reset Link
                </button>
              </form>
            )}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="text-sm text-primary text-center">
              <button type="button" onClick={() => changeStep('email')} className="hover:underline">← Back to Login</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
