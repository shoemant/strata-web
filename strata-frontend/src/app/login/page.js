'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { AnimatePresence } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/utils/supabase/client';
import EmailStep from './steps/EmailStep';
import PasswordStep from './steps/PasswordStep';
import SignupStep from './steps/SignupStep';
import ForgotStep from './steps/ForgotStep';
import ResetStep from './steps/ResetStep';
import VerifyCodeStep from './steps/VerifyCodeStep';
import InviteChoiceStep from './steps/InviteChoiceStep';
import ProgressIndicator from './_components/ProgressIndicator';
import { TERMS_VERSION } from '@/lib/terms';

import {
  checkUserStatus,
  signInWithPassword,
  sendPasswordReset,
  getProfileWithBuilding,
  landingPath,
  requestSignupCode,
  registerVerifiedUser,
} from './lib/authActions';

export default function LoginFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isResetFlow = searchParams.get('reset') === 'true';

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [invite, setInvite] = useState('');
  const [availableInvites, setAvailableInvites] = useState([]);
  const [selectedInviteId, setSelectedInviteId] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [direction, setDirection] = useState(1);
  const [rememberMe, setRememberMe] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [signupSending, setSignupSending] = useState(false);

  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState({ ok: null, msg: '' });

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStep('reset');
          setCheckingSession(false);
        }
      }
    );

    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (isResetFlow) {
        setStep('reset');
        setCheckingSession(false);
        return;
      }

      if (!user) {
        setCheckingSession(false);
        return;
      }

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

  const steps = [
    'email',
    'password',
    'invite-choice',
    'signup',
    'verify',
    'forgot',
    'reset',
  ];

  const goToStep = (newStep) => {
    const curr = steps.indexOf(step);
    const next = steps.indexOf(newStep);
    setDirection(next > curr ? 1 : -1);
    setStep(newStep);
    setError('');

    if (newStep !== 'verify') {
      setResendMsg({ ok: null, msg: '' });
      setResendBusy(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingEmail(true);

    try {
      const result = await checkUserStatus(email);
      const trimmed = email.trim().toLowerCase();

      setEmail(trimmed);
      setInvite('');
      setAvailableInvites([]);
      setSelectedInviteId('');
      setVerificationCode('');

      if (result.exists) {
        goToStep('password');
        return;
      }

      const invites = result.invites || [];

      if (!invites.length) {
        setError(
          'No account was found for that email, and no active invitation exists.'
        );
        return;
      }

      if (invites.length === 1) {
        setAvailableInvites(invites);
        setSelectedInviteId(invites[0].id);
        setInvite(invites[0].role);
        goToStep('signup');
        return;
      }

      setAvailableInvites(invites);
      goToStep('invite-choice');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleInviteChoiceContinue = (e) => {
    e.preventDefault();

    const selected = availableInvites.find(
      (inv) => inv.id === selectedInviteId
    );

    if (!selected) {
      setError('Please choose an invitation to continue.');
      return;
    }

    setInvite(selected.role);
    goToStep('signup');
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

      if (!profile?.full_name) {
        router.push(
          `/onboarding/profile?returnTo=${encodeURIComponent(target)}`
        );
        return;
      }

      router.push(target);
    } catch (err) {
      setError(err.message || 'Failed to log in.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const selected = availableInvites.find(
      (inv) => inv.id === selectedInviteId
    );

    if (!selected) {
      setError('No invitation is selected.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    try {
      setSignupSending(true);

      await requestSignupCode({
        email,
        password,
        full_name: fullName.trim(),
        role: selected.role,
        invite_token: null,
        invite_id: selected.id,
      });

      setVerificationCode('');
      setResendMsg({ ok: null, msg: '' });
      goToStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setSignupSending(false);
    }
  };

  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setVerifyingCode(true);

    try {
      const selected = availableInvites.find(
        (inv) => inv.id === selectedInviteId
      );

      if (!selected) {
        throw new Error('No invitation is selected.');
      }

      await registerVerifiedUser({
        email,
        password,
        full_name: fullName.trim(),
        role: selected.role,
        code: verificationCode,
        invite_token: null,
        invite_id: selected.id,
      });

      const userId = await signInWithPassword(
        email,
        password,
        rememberMe,
        TERMS_VERSION
      );

      if (!userId) {
        setError('Account created, but login failed.');
        return;
      }

      const { profile, buildingId } = await getProfileWithBuilding(userId);
      const target = landingPath(profile?.role, buildingId);

      if (!profile?.full_name) {
        router.push(
          `/onboarding/profile?returnTo=${encodeURIComponent(target)}`
        );
        return;
      }

      router.push(target);
    } catch (err) {
      setError(err.message || 'Failed to verify code.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const resendConfirmation = async () => {
    setResendBusy(true);
    setResendMsg({ ok: null, msg: '' });

    try {
      const selected = availableInvites.find(
        (inv) => inv.id === selectedInviteId
      );

      if (!selected) {
        throw new Error('No invitation is selected.');
      }

      await requestSignupCode({
        email,
        password,
        full_name: fullName.trim(),
        role: selected.role,
        invite_token: null,
        invite_id: selected.id,
      });

      setResendMsg({ ok: true, msg: 'Verification code sent.' });
    } catch (err) {
      setResendMsg({
        ok: false,
        msg: err.message || 'Failed to resend verification code.',
      });
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
      setError(err.message || 'Failed to send password reset email.');
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
        {loadingEmail && (
          <div className="absolute inset-0 bg-background/50 dark:bg-black/40 backdrop-blur-[1px] pointer-events-none" />
        )}

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

        <p className="sr-only" aria-live="polite">
          {loadingEmail ? 'Checking your email…' : ''}
        </p>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
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

          {step === 'invite-choice' && (
            <InviteChoiceStep
              direction={direction}
              email={email}
              invites={availableInvites}
              selectedInviteId={selectedInviteId}
              setSelectedInviteId={setSelectedInviteId}
              error={error}
              goToStep={goToStep}
              handleInviteChoiceContinue={handleInviteChoiceContinue}
            />
          )}

          {step === 'signup' && (
            <SignupStep
              direction={direction}
              email={email}
              password={password}
              setPassword={setPassword}
              fullName={fullName}
              setFullName={setFullName}
              invite={invite}
              signupSending={signupSending}
              error={error}
              goToStep={goToStep}
              handleSignupSubmit={handleSignupSubmit}
              termsVersion={TERMS_VERSION}
            />
          )}

          {step === 'verify' && (
            <VerifyCodeStep
              direction={direction}
              email={email}
              code={verificationCode}
              setCode={setVerificationCode}
              verifyingCode={verifyingCode}
              error={error}
              goToStep={goToStep}
              handleVerifyCodeSubmit={handleVerifyCodeSubmit}
              resendConfirmation={resendConfirmation}
              resendBusy={resendBusy}
              resendMsg={resendMsg}
            />
          )}

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
