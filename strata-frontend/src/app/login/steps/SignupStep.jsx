"use client";

import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";

export default function SignupStep({
  direction,
  email,
  password,
  setPassword,
  invite,
  signupSending,
  signupSent,
  signupMsg,
  resendBusy,
  resendMsg,
  error,
  goToStep,
  handleSignupSubmit,
  resendConfirmation,
}) {
  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* BEFORE signup */}
      {!signupSent && (
        <form onSubmit={handleSignupSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Create your account</h2>

          <p className="text-center text-muted-foreground dark:text-neutral-400">
            You’ve been invited as a <strong>{invite || "user"}</strong>
          </p>

          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2 rounded border bg-muted text-foreground/70 
                       dark:bg-neutral-800 dark:border-neutral-700"
          />

          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            disabled={signupSending}
            className="w-full px-4 py-2 rounded border border-input focus:ring-2 focus:ring-primary
                       disabled:opacity-60 disabled:cursor-not-allowed
                       dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />

          {error && <p className="text-destructive dark:text-red-400 text-sm">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={signupSending}
            className="w-full py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 
                       transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {signupSending ? (
              <>
                <Spinner className="h-5 w-5" /> Sending…
              </>
            ) : (
              "Sign Up"
            )}
          </motion.button>

          {signupMsg && (
            <p className="text-sm text-foreground/70 dark:text-neutral-300 text-center" aria-live="polite">
              {signupMsg}
            </p>
          )}

          <div className="text-sm text-primary text-center">
            <button type="button" onClick={() => goToStep("email")} disabled={signupSending} className="hover:underline">
              ← Back
            </button>
          </div>
        </form>
      )}

      {/* AFTER signup */}
      {signupSent && (
        <div
          className="rounded-2xl border-2 border-blue-200 dark:border-blue-900 bg-blue-50 
                     dark:bg-blue-950/40 p-5 text-center space-y-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-auto h-14 w-14 rounded-full bg-blue-600 text-white grid place-items-center shadow">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16v12H4z" />
              <path d="m22 6-10 7L2 6" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">Check your email</h3>

          <p className="text-blue-900/80 dark:text-blue-200/80">
            We’ve sent a confirmation link to <strong className="font-semibold">{email}</strong>.
            <br />Click the link to verify your account.
          </p>

          {resendMsg.msg && (
            <p className={resendMsg.ok ? "text-green-700 dark:text-green-300 text-sm" : "text-red-600 dark:text-red-400 text-sm"}>
              {resendMsg.msg}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={resendConfirmation}
              disabled={resendBusy}
              className="w-full py-2 rounded-lg border border-blue-300 dark:border-blue-800 
                         text-blue-800 dark:text-blue-200 bg-white dark:bg-transparent hover:bg-blue-100 
                         dark:hover:bg-blue-900/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resendBusy ? <Spinner className="h-5 w-5" /> : null}
              {resendBusy ? "Resending…" : "Resend email"}
            </button>

            <button
              onClick={() => goToStep("email")}
              className="w-full py-2 rounded-lg border text-blue-700 dark:text-blue-300 bg-white 
                         dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Use a different email
            </button>
          </div>

          <p className="text-xs text-blue-900/70 dark:text-blue-200/70 pt-2">
            Didn’t get it? Check spam, or try resending after a short delay.
          </p>
        </div>
      )}
    </motion.div>
  );
}
