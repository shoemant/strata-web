'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/utils/supabase/client';
import EmailStep from './steps/EmailStep';
import PasswordStep from './steps/PasswordStep';
import SignupStep from './steps/SignupStep';
import ForgotStep from './steps/ForgotStep';
import ResetStep from './steps/ResetStep';
import ProgressIndicator from './_components/ProgressIndicator';

import { TERMS_VERSION } from '@/lib/terms';

import {
  checkEmailForAccount,
  getPendingInviteRole,
  signInWithPassword,
  signUpUser,
  resendSignupEmail,
  sendPasswordReset,
  getProfileWithBuilding,
  landingPath,
} from './lib/authActions';

export default function LoginFlowPage() {
  const router = useRouter();
  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const isResetFlow = searchParams.get('reset') === 'true';

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
  const [signupSent, setSignupSent] = useState(false); // show big panel once sent
  const [signupMsg, setSignupMsg] = useState(''); // screen-reader friendly message
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState({ ok: null, msg: '' });

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStep('reset');
          setCheckingSession(false);
          return;
        }
      }
    );

    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // If we got here via reset password link, do NOT redirect
      if (isResetFlow) {
        setStep('reset');
        setCheckingSession(false);
        return;
      }

      // Not logged in → show login UI
      if (!user) {
        setCheckingSession(false);
        return;
      }

      // Logged in AND NOT in reset mode → redirect to dashboard
      const { profile, buildingId } = await getProfileWithBuilding(user.id);
      const target = landingPath(profile?.role, buildingId);

      if (!profile?.full_name) {
        router.replace(
          `/onboarding/profile?returnTo=${encodeURIComponent(target)}`
        );
      } else {
        router.replace(target);
      }
    };

    checkSession();

    return () => listener.subscription.unsubscribe();
  }, [router, isResetFlow]);

  const steps = ['email', 'password', 'signup', 'forgot'];
  const goToStep = (newStep) => {
    const curr = steps.indexOf(step);
    const next = steps.indexOf(newStep);
    setDirection(next > curr ? 1 : -1);
    setStep(newStep);
    setError('');
    if (newStep !== 'signup') {
      setSignupSent(false);
      setSignupMsg('');
      setSignupSending(false);
      setResendMsg({ ok: null, msg: '' });
    }
  };

  // --- Handlers ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingEmail(true);

    try {
      const { exists, email: trimmed } = await checkEmailForAccount(email);
      setEmail(trimmed);

      if (exists) return goToStep('password');

      const role = await getPendingInviteRole(trimmed);
      setInvite(role);
      goToStep('signup');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingLogin(true);

    try {
      const userId = await signInWithPassword(
        email,
        password,
        rememberMe,
        TERMS_VERSION
      );
      if (!userId) return;

      const { profile, buildingId } = await getProfileWithBuilding(userId);
      const target = landingPath(profile?.role, buildingId);

      if (!profile?.full_name)
        return router.push(
          `/onboarding/profile?returnTo=${encodeURIComponent(target)}`
        );

      router.push(target);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setSignupSending(true);
      await signUpUser(email, password, TERMS_VERSION);
      setSignupSent(true);
      setSignupMsg(`Confirmation email is on its way to ${email}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSignupSending(false);
    }
  };

  const resendConfirmation = async () => {
    setResendBusy(true);
    try {
      await resendSignupEmail(email);
      setResendMsg({ ok: true, msg: 'Confirmation email sent.' });
    } catch (err) {
      setResendMsg({ ok: false, msg: err.message });
    } finally {
      setResendBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (checkingSession) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-primary">
          <Spinner className="h-6 w-6 mb-3" />
          <span className="text-lg font-medium">Signing you in…</span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md p-6 sm:p-8 overflow-y-auto max-h-[90vh] rounded-2xl shadow-lg bg-card text-foreground bg-gradient-to-br from-blue-50 to-white dark:from-neutral-900 dark:to-neutral-950 dark:bg-none">
        {/* Optional global dim overlay while checking */}
        {loadingEmail && (
          <div className="absolute inset-0 bg-background/50 dark:bg-black/40 backdrop-blur-[1px] pointer-events-none" />
        )}

        {/* Logo */}
        <div className="w-full flex justify-center mb-4">
          <img
            src="/images/logo.png"
            alt="MyBuilding Logo"
            className="w-full max-h-20 object-contain invert-0"
          />
        </div>

        <ProgressIndicator step={step} />

        {loadingLogin && (
          <div className="fixed inset-0 z-[60] bg-background/70 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div
              className="flex items-center gap-3 text-primary"
              role="status"
              aria-live="polite"
            >
              <Spinner className="h-6 w-6" />
              <span className="text-lg font-medium">Logging you in…</span>
            </div>
          </div>
        )}

        {/* polite SR live region */}
        <p className="sr-only" aria-live="polite">
          {loadingEmail ? 'Checking your email…' : ''}
          {signupMsg}
        </p>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {/* EMAIL STEP */}
          {step === 'email' && (
            <EmailStep
              direction={direction}
              email={email}
              loadingEmail={loadingEmail}
              error={error}
              setEmail={setEmail}
              handleEmailSubmit={handleEmailSubmit}
            />
          )}

          {/* PASSWORD STEP */}
          {step === 'password' && (
            <PasswordStep
              direction={direction}
              email={email}
              password={password}
              setPassword={setPassword}
              loadingLogin={loadingLogin}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              error={error}
              goToStep={goToStep}
              handlePasswordSubmit={handlePasswordSubmit}
            />
          )}

          {/* SIGNUP STEP */}
          {step === 'signup' && (
            <SignupStep
              direction={direction}
              email={email}
              password={password}
              setPassword={setPassword}
              invite={invite}
              signupSending={signupSending}
              signupSent={signupSent}
              signupMsg={signupMsg}
              resendBusy={resendBusy}
              resendMsg={resendMsg}
              error={error}
              goToStep={goToStep}
              handleSignupSubmit={handleSignupSubmit}
              resendConfirmation={resendConfirmation}
              termsVersion={TERMS_VERSION}
            />
          )}

          {/* FORGOT STEP */}
          {step === 'forgot' && (
            <ForgotStep
              direction={direction}
              email={email}
              setEmail={setEmail}
              resetSent={resetSent}
              error={error}
              goToStep={goToStep}
              handleForgotPassword={handleForgotPassword}
            />
          )}

          {step === 'reset' && (
            <ResetStep direction={direction} goToStep={goToStep} />
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
