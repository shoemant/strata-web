'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import AuthLayout from '@/components/AuthLayout';
import { AnimatePresence, motion } from 'framer-motion';

// Simple 3-step progress indicator
function ProgressIndicator({ step }) {
  const steps = ['email', 'password', 'signup'];
  return (
    <div className="flex justify-center space-x-2 mb-6">
      {steps.map((s) => (
        <div
          key={s}
          className={`w-3 h-3 rounded-full transition-colors ${step === s || (step === 'forgot' && s === 'password')
            ? 'bg-primary'
            : 'bg-gray-300'
            }`}
        />
      ))}
    </div>
  );
}

export default function LoginFlowPage() {
  const router = useRouter();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invite, setInvite] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [direction, setDirection] = useState(1);
  const [rememberMe, setRememberMe] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/check-user`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: trimmed }) }
      );
      const { exists, invite: inv, error: backendError } = await res.json();
      if (backendError) return setError(backendError);
      setInvite(inv);
      setEmail(trimmed);
      setStep(exists ? 'password' : 'signup');
    } catch {
      setError('Something went wrong. Please try again later.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) return setError(loginError.message);
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        options: { maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined }
      });
    }
    router.push('/');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { data, error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) return setError(signupError.message);
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        options: { maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined }
      });
    }
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

  const steps = ['email', 'password', 'signup', 'forgot'];
  const changeStep = (newStep) => {
    const curr = steps.indexOf(step);
    const next = steps.indexOf(newStep);
    setDirection(next > curr ? 1 : -1);
    setStep(newStep);
    setError('');
  };

  return (
    <AuthLayout>
      {/* Left image animation handled in AuthLayout */}
      <div className="w-full max-w-sm p-8 space-y-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg relative overflow-hidden">
        <ProgressIndicator step={step} />
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {step === 'email' && (
            <motion.form
              key="email"
              onSubmit={handleEmailSubmit}
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-text text-center">Welcome back!</h2>
              <p className="text-text text-center">Enter your email to log in or register.</p>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="✉️ you@example.com"
                required
                className="w-full p-3 border border-accent rounded-md bg-white text-text focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition"
              >
                Next
              </motion.button>
            </motion.form>
          )}

          {step === 'password' && (
            <motion.form
              key="password"
              onSubmit={handlePasswordSubmit}
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-text text-center">Enter your password</h2>
              <p className="text-text text-center">for <strong>{email}</strong></p>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full p-3 border border-accent rounded-md bg-white text-text focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition"
              >
                Log In
              </motion.button>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute top-0 left-0 w-6 h-6 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition-transform" />
                  </div>
                  <span className="text-sm text-text">Remember me</span>
                </label>
                <div className="space-x-4 text-sm text-primary">
                  <button type="button" onClick={() => changeStep('email')} className="hover:underline">← Back</button>
                  <button type="button" onClick={() => changeStep('forgot')} className="hover:underline">Forgot?</button>
                </div>
              </div>
            </motion.form>
          )}

          {step === 'signup' && (
            <motion.form
              key="signup"
              onSubmit={handleSignupSubmit}
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-text text-center">Create your account</h2>
              <p className="text-text text-center">You’ve been invited as a <strong>{invite || 'user'}</strong></p>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-accent rounded bg-gray-100 text-gray-600"
              />
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="w-full px-4 py-2 border border-accent rounded focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full py-2 bg-primary text-white rounded hover:bg-secondary transition"
              >
                Sign Up
              </motion.button>
              <div className="flex items-center justify-center space-x-2">
                <label className="inline-flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute top-0 left-0 w-6 h-6 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition-transform" />
                  </div>
                  <span className="text-sm text-text">Remember me</span>
                </label>
              </div>
              <div className="text-sm text-primary text-center">
                <button type="button" onClick={() => changeStep('email')} className="hover:underline">← Back</button>
              </div>
            </motion.form>
          )}

          {step === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-text text-center">Reset Password</h2>
              {resetSent ? (
                <p className="text-green-600 text-center">Reset email sent to <strong>{email}</strong>!</p>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full p-3 border border-accent rounded bg-white focus:ring-2 focus:ring-primary"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition"
                  >
                    Send Reset Link
                  </motion.button>
                </form>
              )}
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <div className="text-sm text-primary text-center">
                <button type="button" onClick={() => changeStep('email')} className="hover:underline">← Back to Login</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
