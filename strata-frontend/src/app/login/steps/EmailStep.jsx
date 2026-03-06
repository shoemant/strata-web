'use client';

import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import OAuthButtons from '../_components/OAuthButtons';

export default function EmailStep({
  direction,
  email,
  loadingEmail,
  error,
  setEmail,
  handleEmailSubmit,
}) {
  return (
    <>
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
        <h2 className="text-xl sm:text-2xl font-bold text-center">Welcome!</h2>

        <p className="text-sm sm:text-base text-center text-muted-foreground dark:text-neutral-400">
          Enter your email to log in or register.
        </p>

        <div className="relative">
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
            disabled={loadingEmail}
            className="w-full p-3 pr-10 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />

          {loadingEmail && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
              <Spinner className="h-5 w-5" />
            </div>
          )}
        </div>

        {error && (
          <p className="text-destructive dark:text-red-400 text-sm">{error}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={loadingEmail}
          className="w-full p-3 rounded transition flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loadingEmail ? (
            <>
              <Spinner className="h-5 w-5" /> Checking…
            </>
          ) : (
            'Next'
          )}
        </motion.button>
      </motion.form>

      <div className="flex items-center py-4">
        <div className="flex-grow border-t border-muted" />
        <span className="mx-3 text-xs uppercase text-muted-foreground">or</span>
        <div className="flex-grow border-t border-muted" />
      </div>

      <OAuthButtons />
    </>
  );
}
