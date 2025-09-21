'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import AuthLayout from '@/components/AuthLayout';
import { AnimatePresence, motion } from 'framer-motion';

// Tiny spinner (no external CSS)
function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin h-4 w-4 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// Simple 3-step progress indicator
function ProgressIndicator({ step }) {
  const steps = ['email', 'password', 'signup'];
  return (
    <div className="flex justify-center space-x-2 mb-6">
      {steps.map((s) => (
        <div
          key={s}
          className={`w-3 h-3 rounded-full transition-colors ${step === s || (step === 'forgot' && s === 'password') ? 'bg-primary' : 'bg-gray-300'
            }`}
        />
      ))}
    </div>
  );
}

async function getProfileWithBuilding(supabase, userId) {
  // Join the unit to derive building_id when role is owner/tenant
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(`
      full_name,
      role,
      building_id,
      unit_id,
      units!user_profiles_unit_id_fkey ( building_id )  -- join via FK
    `)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  // Prefer explicit building_id; else derive from unit join
  const derivedBuildingId = profile?.building_id || profile?.units?.building_id || null;

  return { profile, buildingId: derivedBuildingId };

}

function landingPath(role, buildingId) {
  if (role === 'manager') {
    return buildingId ? `/manager/buildings/${buildingId}/dashboard` : `/manager/dashboard`;
  }
  if (role === 'owner') {
    return buildingId ? `/owner/buildings/${buildingId}/dashboard` : `/owner/dashboard`;
  }
  if (role === 'tenant') {
    return buildingId ? `/tenant/buildings/${buildingId}/dashboard` : `/tenant/dashboard`;
  }
  return '/';
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
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Sign-up UX guards / messaging
  const [signupSending, setSignupSending] = useState(false); // prevent double submit
  const [signupSent, setSignupSent] = useState(false);       // show big panel once sent
  const [signupMsg, setSignupMsg] = useState('');            // "sending confirmation…" message
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState({ ok: null, msg: '' });

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    setLoadingEmail(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const { exists, invite: inv, error: backendError } = await res.json();
      if (backendError) return setError(backendError);
      setEmail(trimmed)
      const hasInvite = Boolean(inv)
      if (exists) {
        setInvite(null)
        return goToStep('password');
      }
      if (hasInvite) {
        setInvite(inv);
        return goToStep('signup');
      }
      // no account no invite -> block signup and show error
      setInvite(null);
      setError('Could not find an active account or invitation. If this is a mistake, please contact your building manager.');
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingLogin(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message);
        return;
      }
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          options: { maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined },
        });
      }

      // Accept pending invites ONCE (don’t call it twice)
      const { error: acceptError } = await supabase.rpc('accept_invites_for_current_user');
      if (acceptError) console.error('accept_invites_for_current_user error:', acceptError);

      const { data: me } = await supabase.auth.getUser();
      const userId = me?.user?.id;
      if (!userId) return router.push('/login');

      // Pull role + building via unit join
      const { profile, buildingId } = await getProfileWithBuilding(supabase, userId);

      // Decide where to go
      const landing = landingPath(profile?.role, buildingId);

      // If missing name, go complete profile, preserving target
      if (!profile?.full_name) {
        return router.push(`/onboarding/profile?returnTo=${encodeURIComponent(landing)}`);
      }

      router.push(landing);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while logging in.');
    } finally {
      setLoadingLogin(false);
    }
  };


  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (signupSending) return; // hard guard
    setSignupSending(true);
    setSignupMsg('Sending confirmation email…');

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      // ensures the email link knows where to bring the user after they confirm
      options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (signupError) {
      setError(signupError.message);
      setSignupMsg('');
      setSignupSending(false);
      return;
    }

    // Show prominent panel and message in-place
    setSignupMsg(`Confirmation email is on its way to ${email}.`);
    setSignupSent(true);
  };

  const resendConfirmation = async () => {
    if (!email) return;
    setResendBusy(true);
    setResendMsg({ ok: null, msg: '' });
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${location.origin}/` },
    });
    if (error) setResendMsg({ ok: false, msg: error.message });
    else setResendMsg({ ok: true, msg: 'Confirmation email sent.' });
    setResendBusy(false);
  };

  const steps = ['email', 'password', 'signup', 'forgot'];
  const goToStep = (newStep) => {
    const curr = steps.indexOf(step);
    const next = steps.indexOf(newStep);
    setDirection(next > curr ? 1 : -1); // forward = +1, back = -1
    setStep(newStep);
    setError('');
    // reset signup panel state when navigating away
    if (newStep !== 'signup') {
      setSignupSent(false);
      setSignupMsg('');
      setSignupSending(false);
      setResendMsg({ ok: null, msg: '' });
      setInvite(null);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md p-8 space-y-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg relative overflow-hidden">
        {/* Optional global dim overlay while checking */}
        {loadingEmail && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none" />}

        <div className="w-full flex justify-center mb-4">
          <img
            src="/images/logo.png"
            alt="MyBuilding Logo"
            className="w-full max-h-20 object-contain"
          />
        </div>

        <ProgressIndicator step={step} />

        {loadingLogin && (
          <div className="fixed inset-0 z-[60] bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-3 text-primary" role="status" aria-live="polite">
              <Spinner className="h-6 w-6" />
              <span className="text-lg font-medium">Logging you in…</span>
            </div>
          </div>
        )}

        {/* polite live region for SRs to announce loading */}
        <p className="sr-only" aria-live="polite">
          {loadingEmail ? 'Checking your email…' : ''}
          {signupMsg}
        </p>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {step === 'email' && (
            <motion.form
              key="email"
              onSubmit={handleEmailSubmit}
              initial={{ opacity: 0, x: -direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
              aria-busy={loadingEmail}
            >
              <h2 className="text-2xl font-bold text-text text-center">Welcome!</h2>
              <p className="text-text text-center">Enter your email to log in or register.</p>

              <div className="relative">
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="✉️ you@example.com"
                  required
                  disabled={loadingEmail}
                  className="w-full p-3 pr-10 border border-accent rounded-md bg-white text-text focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {loadingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                    <Spinner />
                  </div>
                )}
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loadingEmail}
                className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingEmail ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    Checking…
                  </>
                ) : (
                  'Next'
                )}
              </motion.button>
            </motion.form>
          )}

          {step === 'password' && (
            <motion.form
              key="password"
              onSubmit={handlePasswordSubmit}
              initial={{ opacity: 0, x: -direction * 100 }} // keep slide direction consistent
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
              aria-busy={loadingLogin}
            >
              <h2 className="text-2xl font-bold text-text text-center">Enter your password</h2>
              <p className="text-text text-center">
                for <strong>{email}</strong>
              </p>

              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                disabled={loadingLogin}
                className="w-full p-3 border border-accent rounded-md bg-white text-text focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loadingLogin}
                className="w-full p-3 bg-primary text-white rounded hover:bg-secondary transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingLogin ? (
                  <>
                    <Spinner className="h-5 w-5" /> Logging in…
                  </>
                ) : (
                  'Log In'
                )}
              </motion.button>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loadingLogin}
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute top-0 left-0 w-6 h-6 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition-transform" />
                  </div>
                  <span className="text-sm text-text">Remember me</span>
                </label>
                <div className="space-x-4 text-sm text-primary">
                  <button type="button" onClick={() => goToStep('email')} className="hover:underline" disabled={loadingLogin}>
                    ← Back
                  </button>
                  <button type="button" onClick={() => goToStep('forgot')} className="hover:underline" disabled={loadingLogin}>
                    Forgot?
                  </button>
                </div>
              </div>
            </motion.form>
          )}

          {step === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-6"
            >
              {!signupSent ? (
                // SIGNUP FORM (before sending)
                <form onSubmit={handleSignupSubmit} className="space-y-6">
                  <h2 className="text-2xl font-bold text-text text-center">Create your account</h2>
                  {invite ? (
                    <p className="text-text text-center">
                      You’ve been invited as a <strong>{invite}</strong>
                    </p>
                  ) : null}
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
                    disabled={signupSending}
                    className="w-full px-4 py-2 border border-accent rounded focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={signupSending}
                    className="w-full py-2 bg-primary text-white rounded hover:bg-secondary transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {signupSending ? (
                      <>
                        <Spinner className="h-5 w-5" /> Sending…
                      </>
                    ) : (
                      'Sign Up'
                    )}
                  </motion.button>
                  {signupMsg && (
                    <p className="text-sm text-gray-600 text-center" aria-live="polite">
                      {signupMsg}
                    </p>
                  )}
                  <div className="text-sm text-primary text-center">
                    <button type="button" onClick={() => goToStep('email')} className="hover:underline" disabled={signupSending}>
                      ← Back
                    </button>
                  </div>
                </form>
              ) : (
                // PROMINENT CONFIRMATION PANEL (after sending)
                <div
                  className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 text-center space-y-4"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="mx-auto h-14 w-14 rounded-full bg-blue-600 text-white grid place-items-center shadow">
                    {/* Mail icon in pure SVG to avoid extra deps */}
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16v12H4z" />
                      <path d="m22 6-10 7L2 6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-blue-900">Check your email</h3>
                  <p className="text-blue-900/80">
                    We’ve sent a confirmation link to{' '}
                    <strong className="font-semibold">{email}</strong>.
                    <br />
                    Click the link to verify your account.
                  </p>

                  {resendMsg.msg && (
                    <p className={resendMsg.ok ? 'text-green-700 text-sm' : 'text-red-600 text-sm'}>
                      {resendMsg.msg}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={resendConfirmation}
                      disabled={resendBusy}
                      className="w-full py-2 rounded-lg border border-blue-300 text-blue-800 bg-white hover:bg-blue-100 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {resendBusy ? <Spinner /> : null}
                      {resendBusy ? 'Resending…' : 'Resend email'}
                    </button>
                    <button
                      onClick={() => goToStep('email')}
                      className="w-full py-2 rounded-lg border text-blue-700 bg-white hover:bg-gray-50 transition"
                    >
                      Use a different email
                    </button>
                  </div>

                  <p className="text-xs text-blue-900/70 pt-2">
                    Didn’t get it? Check spam, or try resending after a short delay.
                  </p>
                </div>
              )}
            </motion.div>
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
                <p className="text-green-600 text-center">
                  Reset email sent to <strong>{email}</strong>!
                </p>
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
                <button type="button" onClick={() => goToStep('email')} className="hover:underline">
                  ← Back to Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
