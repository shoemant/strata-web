'use client';
import { useState, useEffect } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import BookingList from '../../components/BookingList';

export default function BookingsPage() {
  const supabase = useSupabaseClient();
  const { data: session } = useSession();
  const [bookings, setBookings] = useState([]);

  const fetch = () =>
    supabase
      .from('bookings')
      .select('*')
      .eq('user_id', session?.user.id)
      .then(({ data }) => setBookings(data || []));

  useEffect(() => {
    if (session) fetch();
  }, [session]);

  return (
    <div className="space-y-6">
      <BookingForm onSuccess={fetch} />
      <BookingList bookings={bookings} />
    </div>
  );
}
