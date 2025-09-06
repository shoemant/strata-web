'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function PasswordLogin() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (loginError) {
            setError(loginError.message);
            return;
        }

        const user = loginData?.user;
        if (!user) {
            setError('Login succeeded but user data is missing.');
            return;
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile) {
            const { data: managerRow } = await supabase
                .from('manager_buildings')
                .select('id')
                .eq('email', user.email)
                .eq('user_id', user.id)
                .maybeSingle();

            if (managerRow) {
                await supabase.from('user_profiles').insert({
                    id: user.id,
                    email: user.email,
                    role: 'manager',
                });

                return router.push('/manager/dashboard');
            }
        }

        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Enter Password for {email}</h2>
                {error && <div className="text-red-600 mb-2">{error}</div>}

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border w-full p-2 mb-4"
                />

                <button className="bg-blue-600 text-white py-2 w-full rounded mb-4">Log In</button>

                <div className="flex justify-between text-sm text-blue-600">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="hover:underline"
                    >
                        ← Back
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push(`/forgot-password?email=${encodeURIComponent(email || '')}`)}
                        className="hover:underline"
                    >
                        Forgot Password?
                    </button>
                </div>
            </form>
        </div>
    );
}
