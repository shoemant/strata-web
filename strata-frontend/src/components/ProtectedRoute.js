'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function ProtectedRoute({ children, allowedRoles }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        router.replace('/login');
        return;
      }

      if (allowedRoles.includes(profile.role)) {
        setIsAllowed(true);
      } else {
        router.replace('/unauthorized');
      }

      setChecking(false);
    };

    verifyAuth();
  }, [allowedRoles, router]);

  if (checking) return null;

  return isAllowed ? children : null;
}
