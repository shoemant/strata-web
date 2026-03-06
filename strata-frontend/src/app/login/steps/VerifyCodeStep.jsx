'use client';

import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';

export default function VerifyCodeStep({
  direction,
  email,
  code = '',
  setCode,
  verifyingCode,
  error,
  goToStep,
  handleVerifyCodeSubmit,
  resendConfirmation,
  resendBusy,
  resendMsg,
}) {
  return (
    <motion.form
      key="verify"
      onSubmit={handleVerifyCodeSubmit}
      initial={{ opacity: 0, x: -direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * 100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-center">Verify your email</h2>

      <p className="text-center text-muted-foreground">
        Enter the 6-digit code sent to <strong>{email}</strong>
      </p>

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="123456"
        required
        className="w-full p-3 rounded-md border border-input bg-background text-foreground text-center tracking-[0.4em]"
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {resendMsg?.msg ? (
        <p
          className={
            resendMsg.ok
              ? 'text-green-600 dark:text-green-400 text-sm'
              : 'text-red-600 dark:text-red-400 text-sm'
          }
        >
          {resendMsg.msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={verifyingCode || (code || '').length !== 6}
        className="w-full p-3 rounded bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {verifyingCode ? (
          <>
            <Spinner className="h-5 w-5" /> Verifying…
          </>
        ) : (
          'Create Account'
        )}
      </button>

      <div className="flex justify-between text-sm text-primary">
        <button
          type="button"
          onClick={() => goToStep('signup')}
          className="hover:underline"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={resendConfirmation}
          disabled={resendBusy}
          className="hover:underline disabled:opacity-60"
        >
          {resendBusy ? 'Sending…' : 'Resend code'}
        </button>
      </div>
    </motion.form>
  );
}
