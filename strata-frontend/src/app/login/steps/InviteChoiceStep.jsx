'use client';

import { motion } from 'framer-motion';

export default function InviteChoiceStep({
  direction,
  email,
  invites,
  selectedInviteId,
  setSelectedInviteId,
  error,
  goToStep,
  handleInviteChoiceContinue,
}) {
  return (
    <motion.div
      key="invite-choice"
      initial={{ opacity: 0, x: direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <form onSubmit={handleInviteChoiceContinue} className="space-y-6">
        <h2 className="text-2xl font-bold text-center">
          Choose your invitation
        </h2>

        <p className="text-center text-muted-foreground dark:text-neutral-400">
          We found multiple invitations for <strong>{email}</strong>. Choose the
          one you want to accept.
        </p>

        <div className="space-y-3">
          {invites.map((invite) => {
            const label = invite.unit_label
              ? `${invite.building_label} • Unit ${invite.unit_label}`
              : invite.building_label;

            return (
              <label
                key={invite.id}
                className={`block rounded-lg border p-4 cursor-pointer transition ${
                  selectedInviteId === invite.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="inviteChoice"
                    value={invite.id}
                    checked={selectedInviteId === invite.id}
                    onChange={() => setSelectedInviteId(invite.id)}
                    className="mt-1"
                  />

                  <div className="space-y-1">
                    <p className="font-medium capitalize">{invite.role}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    {invite.expires_at ? (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(invite.expires_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {error ? (
          <p className="text-destructive dark:text-red-400 text-sm">{error}</p>
        ) : null}

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="w-full py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition"
        >
          Continue
        </motion.button>

        <div className="text-sm text-primary text-center">
          <button
            type="button"
            onClick={() => goToStep('email')}
            className="hover:underline"
          >
            ← Back
          </button>
        </div>
      </form>
    </motion.div>
  );
}
