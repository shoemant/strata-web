'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';

export default function SignupStep({
  direction,
  email,
  password,
  setPassword,
  fullName,
  setFullName,
  invite,
  signupSending,
  error,
  goToStep,
  handleSignupSubmit,
  termsVersion,
}) {
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState('');

  const canSubmit = useMemo(() => {
    return Boolean(password && fullName.trim() && agreed && !signupSending);
  }, [password, fullName, agreed, signupSending]);

  const onSubmit = (e) => {
    if (!agreed) {
      e.preventDefault();
      setTermsError('You must agree to the Terms & Conditions to continue.');
      return;
    }

    setTermsError('');
    handleSignupSubmit(e);
  };

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Create your account</h2>

        <p className="text-center text-muted-foreground dark:text-neutral-400">
          Finish setting up your account, then we’ll send you a verification
          code.
        </p>

        <input
          type="email"
          value={email}
          disabled
          className="w-full px-4 py-2 rounded border bg-muted text-foreground/70 dark:bg-neutral-800 dark:border-neutral-700"
        />

        <motion.input
          whileFocus={{ scale: 1.02 }}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          required
          disabled={signupSending}
          className="w-full px-4 py-2 rounded border border-input focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />

        <motion.input
          whileFocus={{ scale: 1.02 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          disabled={signupSending}
          className="w-full px-4 py-2 rounded border border-input focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />

        {invite ? (
          <p className="text-sm text-center text-muted-foreground dark:text-neutral-400">
            You were invited as a{' '}
            <strong className="capitalize">{invite}</strong>.
          </p>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-start gap-3 text-sm text-foreground/80 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setTermsError('');
              }}
              disabled={signupSending}
              className="mt-1 h-4 w-4 rounded border border-input"
            />
            <span>
              I agree to the{' '}
              <Link
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Terms & Conditions
              </Link>{' '}
              {termsVersion ? (
                <span className="text-xs text-muted-foreground">
                  (version {termsVersion})
                </span>
              ) : null}{' '}
              and acknowledge the{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {termsError && (
            <p className="text-destructive dark:text-red-400 text-sm">
              {termsError}
            </p>
          )}
        </div>

        {error && (
          <p className="text-destructive dark:text-red-400 text-sm">{error}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {signupSending ? (
            <>
              <Spinner className="h-5 w-5" /> Sending code…
            </>
          ) : (
            'Continue'
          )}
        </motion.button>

        <div className="text-sm text-primary text-center">
          <button
            type="button"
            onClick={() => goToStep('email')}
            disabled={signupSending}
            className="hover:underline"
          >
            ← Back
          </button>
        </div>
      </form>
    </motion.div>
  );
}
