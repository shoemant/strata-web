'use client';
import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import BookingList from '@/components/BookingList';
import LogoutButton from '@/components/LogoutButton';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function TenantDashboard() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!session?.user) return;

    const loadBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', session.user.id);

      if (data) setBookings(data);
    };

    loadBookings();
  }, [session]);

  if (!session) return <p>Loading your session...</p>;

  return (
    <ProtectedRoute allowedRole={['tenant']}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Bookings</h2>
          <LogoutButton />
        </div>
        <BookingList bookings={bookings} />
      </div>
    </ProtectedRoute>
  );
}
