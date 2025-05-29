'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const { data: sessionData, error } = await supabase.auth.getSession();

      if (error || !sessionData.session?.user) {
        console.error('Session error:', error);
        router.push('/login');
        return;
      }

      const user = sessionData.session.user;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profileError || !profile.role) {
        router.push('/complete-profile');
      } else {
        const role = profile.role;
        if (role === 'tenant') router.push('/tenant/dashboard');
        else if (role === 'owner') router.push('/owner/dashboard');
        else if (role === 'manager') router.push('/manager/dashboard');
        else router.push('/login');
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 border-solid mr-3"></div>
      <span>Signing you in with Google...</span>
    </div>
  );
}
