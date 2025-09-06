'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function ManagerSignupPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const email = searchParams.get('email');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);

    // Check if already logged in
    useEffect(() => {
        const checkUser = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData?.user;

            if (user) {
                // 1. Upsert user profile
                await supabase.from('user_profiles').upsert({
                    id: user.id,
                    email: user.email,
                    role: 'manager',
                });

                // 2. Update manager_buildings with user_id
                await supabase
                    .from('manager_buildings')
                    .update({ user_id: user.id })
                    .eq('email', user.email)
                    .is('user_id', null); // only update if not already linked

                // 3. Fetch building_id and update user profile
                const { data: managerRow } = await supabase
                    .from('manager_buildings')
                    .select('building_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (managerRow?.building_id) {
                    await supabase
                        .from('user_profiles')
                        .update({ building_id: managerRow.building_id })
                        .eq('id', user.id);
                }

                router.push('/manager/dashboard');
            } else {
                setChecking(false);
            }
        };

        checkUser();
    }, [router]);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        const { data, error: signupError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signupError) {
            setError(signupError.message);
            return;
        }

        // wait for email confirmation step
        router.push('/confirm-email');
    };

    if (checking) {
        return <div className="text-center p-8">Checking your status...</div>;
    }

    return (
        <div className="max-w-md mx-auto mt-12 p-6 border rounded-xl shadow bg-white">
            <h1 className="text-2xl font-bold text-center mb-4">Manager Sign Up</h1>
            <p className="text-center text-sm mb-4">
                You’ve been invited as a building manager. Sign up below using your invited email.
            </p>

            {error && <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded">{error}</div>}

            <form onSubmit={handleSignup} className="space-y-4">
                <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2 border rounded bg-gray-100 text-gray-600"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-4 py-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Sign Up
                </button>
            </form>
        </div>
    );
}
