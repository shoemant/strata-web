'use client';

import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';

export default function PasswordStep({
  direction,
  email,
  password,
  setPassword,
  loadingLogin,
  rememberMe,
  setRememberMe,
  error,
  goToStep,
  handlePasswordSubmit,
}) {
  return (
    <motion.form
      key="password"
      onSubmit={handlePasswordSubmit}
      initial={{ opacity: 0, x: -direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * 100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
      aria-busy={loadingLogin}
    >
      <h2 className="text-2xl font-bold text-center">Enter your password</h2>

      <p className="text-center text-muted-foreground dark:text-neutral-400">
        for <strong>{email}</strong>
      </p>

      <motion.input
        whileFocus={{ scale: 1.02 }}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        autoFocus
        required
        disabled={loadingLogin}
        className="w-full p-3 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />

      {error && (
        <p className="text-destructive dark:text-red-400 text-sm">{error}</p>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        type="submit"
        disabled={loadingLogin}
        className="w-full p-3 rounded transition flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-70 disabled:cursor-not-allowed"
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
        <label className="inline-flex items-center space-x-2 select-none">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loadingLogin}
              aria-label="Remember me"
            />
            <div className="w-10 h-6 rounded-full bg-gray-200 dark:bg-neutral-700 peer-checked:bg-primary transition-colors" />
            <div className="absolute top-0 left-0 w-6 h-6 bg-white dark:bg-neutral-100 rounded-full shadow transform peer-checked:translate-x-4 transition-transform" />
          </div>
          <span className="text-sm text-foreground/80 dark:text-neutral-300">
            Remember me
          </span>
        </label>

        <div className="space-x-4 text-sm text-primary">
          <button
            type="button"
            onClick={() => goToStep('email')}
            disabled={loadingLogin}
            className="hover:underline"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => goToStep('forgot')}
            disabled={loadingLogin}
            className="hover:underline"
          >
            Forgot?
          </button>
        </div>
      </div>
    </motion.form>
  );
}
