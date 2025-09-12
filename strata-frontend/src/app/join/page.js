// app/join/page.jsx (or a client component on that route)
'use client';
import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function JoinPage() {
    const supabase = useSupabaseClient();
    const session = useSession();
    const params = useSearchParams();
    const router = useRouter();

    const [msg, setMsg] = useState('Validating invite…');
    const token = params.get('token');

    useEffect(() => {
        (async () => {
            if (!token) {
                setMsg('Missing invite token.');
                return;
            }
            if (!session) {
                // Redirect to sign-in preserving the token
                router.replace(`/auth/sign-in?next=/join?token=${encodeURIComponent(token)}`);
                return;
            }

            const { data, error } = await supabase.rpc('accept_invite', { p_token: token });

            if (error) {
                console.error('accept_invite error', error);
                setMsg(error.message || 'Unable to accept invite.');
                return;
            }

            setMsg('Invite accepted! Redirecting…');
            // Optionally route to the building dashboard
            router.replace('/manager/dashboard'); // or `/buildings/${data.building_id}`
        })();
    }, [token, session, supabase, router]);

    return <p className="p-6 text-sm text-muted-foreground">{msg}</p>;
}
