"use client";

import { motion } from "framer-motion";

export default function ForgotStep({
  direction,
  email,
  setEmail,
  resetSent,
  error,
  goToStep,
  handleForgotPassword,
}) {
  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, x: direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-center">Reset Password</h2>

      {resetSent ? (
        <p className="text-green-600 dark:text-green-400 text-center">
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
            className="w-full p-3 rounded border border-input bg-background text-foreground 
                       focus:ring-2 focus:ring-primary dark:border-neutral-700 
                       dark:bg-neutral-900 dark:text-neutral-100"
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full p-3 rounded bg-primary text-primary-foreground hover:bg-primary/80 
                       transition"
          >
            Send Reset Link
          </motion.button>
        </form>
      )}

      {error && <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>}

      <div className="text-sm text-primary text-center">
        <button type="button" onClick={() => goToStep("email")} className="hover:underline">
          ← Back to Login
        </button>
      </div>
    </motion.div>
  );
}
