'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useState } from 'react';

export default function ConfirmEmailPage() {
    const params = useSearchParams();
    const router = useRouter();
    const email = params.get('email') || '';
    const [status, setStatus] = useState({ ok: null, msg: '' });
    const [sending, setSending] = useState(false);

    const resend = async () => {
        setSending(true);
        setStatus({ ok: null, msg: '' });
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: `${location.origin}/` },
        });
        if (error) setStatus({ ok: false, msg: error.message });
        else setStatus({ ok: true, msg: 'Confirmation email re-sent.' });
        setSending(false);
    };

    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="max-w-md w-full bg-white p-6 rounded-lg border space-y-4">
                <h1 className="text-xl font-semibold">Check your email</h1>
                <p>
                    We’ve sent a confirmation link to <strong>{email || 'your email'}</strong>. Click the link
                    to verify your account. You can close this window after confirming.
                </p>
                {status.msg && (
                    <div className={status.ok ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{status.msg}</div>
                )}
                <div className="flex gap-2">
                    <button
                        onClick={resend}
                        disabled={sending}
                        className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                    >
                        {sending ? 'Sending…' : 'Resend email'}
                    </button>
                    <button onClick={() => router.push('/')} className="px-3 py-2 border rounded">
                        Go home
                    </button>
                </div>
            </div>
        </div>
    );
}
