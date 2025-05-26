import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function DashboardLanding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error || !user) {
        navigate('/');
        return;
      }

      setUser(user);

      // Redirect based on role
      const role = user.user_metadata?.role;
      if (role === 'manager') navigate('/manager-dashboard');
      else if (role === 'owner') navigate('/owner-dashboard');
      else navigate('/tenant-dashboard');
    };

    getUser();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600 text-lg">Redirecting to your dashboard...</p>
    </div>
  );
}
