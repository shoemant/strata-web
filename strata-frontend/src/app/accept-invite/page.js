'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  resolveInviteToken,
  requestSignupCode,
  registerVerifiedUser,
  signInWithPassword,
  acceptInviteForCurrentUser,
  getProfileWithBuilding,
  landingPath,
} from '@/app/login/lib/authActions';

const MIN_PASSWORD_LENGTH = 8;

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [existingPassword, setExistingPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const [working, setWorking] = useState(false);

  const inviteSummary = useMemo(() => {
    if (!invite) return '';
    const role = invite.role;
    const building = invite.building_label || invite.building_id;
    const unit =
      invite.role === 'manager'
        ? null
        : invite.unit_label || invite.unit_number || invite.unit_id;

    return unit
      ? `Invited as ${role} for ${building}, unit ${unit}.`
      : `Invited as ${role} for ${building}.`;
  }, [invite]);

  useEffect(() => {
    let ignore = false;

    async function loadInvite() {
      if (!token) {
        setError('Missing invite token.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const resolved = await resolveInviteToken(token);

        if (ignore) return;
        setInvite(resolved);
      } catch (err) {
        if (ignore) return;
        setError(err.message || 'Invalid or expired invite link.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadInvite();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function routeSignedInUser(userId) {
    const { profile, buildingId } = await getProfileWithBuilding(userId);
    const role = profile?.role || invite?.role;
    router.replace(
      landingPath(role, buildingId || invite?.building_id || null)
    );
  }

  async function handleExistingUserSignIn(e) {
    e.preventDefault();

    if (!invite?.existing_account) return;

    if (!existingPassword) {
      setError('Please enter your password.');
      return;
    }

    setWorking(true);
    setError('');
    setStatus('');

    try {
      const userId = await signInWithPassword(
        invite.email,
        existingPassword,
        false,
        null
      );

      if (!userId) {
        throw new Error('Unable to sign in.');
      }

      await acceptInviteForCurrentUser(token);
      await routeSignedInUser(userId);
    } catch (err) {
      setError(err.message || 'Failed to sign in and accept invite.');
    } finally {
      setWorking(false);
    }
  }

  async function handleSendCode(e) {
    e.preventDefault();

    if (!invite || invite.existing_account) return;

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setWorking(true);
    setError('');
    setStatus('');

    try {
      await requestSignupCode({
        email: invite.email,
        password: newPassword,
        full_name: fullName.trim(),
        role: invite.role,
        invite_token: token,
      });

      setCodeSent(true);
      setStatus('Verification code sent. Check your email.');
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setWorking(false);
    }
  }

  async function handleCompleteRegistration(e) {
    e.preventDefault();

    if (!invite || invite.existing_account) return;

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setWorking(true);
    setError('');
    setStatus('');

    try {
      await registerVerifiedUser({
        email: invite.email,
        password: newPassword,
        full_name: fullName.trim(),
        role: invite.role,
        code: code.trim(),
        invite_token: token,
      });

      const userId = await signInWithPassword(
        invite.email,
        newPassword,
        false,
        null
      );

      if (!userId) {
        throw new Error('Unable to sign in after registration.');
      }

      await routeSignedInUser(userId);
    } catch (err) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <div className="p-6">Validating invitation...</div>;
  }

  if (error && !invite) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!invite) {
    return <div className="p-6 text-red-600">Invite could not be loaded.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Accept invitation</h1>
          <p className="text-sm text-muted-foreground">{inviteSummary}</p>
          <p className="text-sm text-muted-foreground">
            Invited email: <span className="font-medium">{invite.email}</span>
          </p>
        </div>

        {status ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-50/40 p-3 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {invite.existing_account ? (
          <form onSubmit={handleExistingUserSignIn} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input
                type="password"
                className="w-full rounded-md border px-3 py-2"
                placeholder="Enter your password"
                value={existingPassword}
                onChange={(e) => setExistingPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={working}
              className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
            >
              {working ? 'Signing in…' : 'Sign in and accept invite'}
            </button>
          </form>
        ) : (
          <form className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input
                type="password"
                className="w-full rounded-md border px-3 py-2"
                placeholder="Create a password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>

            {codeSent ? (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Verification code
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {!codeSent ? (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={working}
                  className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
                >
                  {working ? 'Sending code…' : 'Send verification code'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteRegistration}
                  disabled={working}
                  className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
                >
                  {working
                    ? 'Completing registration…'
                    : 'Complete registration'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
