import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TenantNavBar from '../../components/TenantNavBar';

export default function TenantBookings() {
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      const { data, error } = await supabase.from('resources').select('*');
      if (error) console.error('Error fetching resources:', error);
      else setResources(data);
    };
    fetchResources();
  }, []);

  const checkAvailability = async () => {
    if (!selected || !date) return;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('resource_id', selected)
      .gte('start_time', startOfDay.toISOString())
      .lte('end_time', endOfDay.toISOString());

    const slots = [];
    for (let hour = 7; hour <= 20; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      const conflict = bookings?.some(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return (slotStart < bEnd && slotEnd > bStart);
      });

      if (!conflict) {
        slots.push({ start: slotStart, end: slotEnd });
      }
    }

    setAvailableSlots(slots);
  };

  const handleBooking = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !selectedSlot) return;

    const { error } = await supabase.from('bookings').insert([{
      user_id: user.id,
      resource_id: selected,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end
    }]);

    if (error) {
      console.error('Booking failed:', error);
      setMessage('Booking failed.');
    } else {
      setMessage('Booking successful!');
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  };

  return (
    <div>
      <TenantNavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Book an Amenity</h1>

        <select value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
          <option value="" disabled>Select a resource</option>
          {resources.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <div className="mt-4">
          <label>Select Date:</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={checkAvailability} className="ml-4">Check Availability</button>
        </div>

        {availableSlots.length > 0 && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Available Time Slots</h2>
            <ul className="space-y-2">
              {availableSlots.map((slot, index) => (
                <li key={index}>
                  <button
                    className={`p-2 border ${selectedSlot === slot ? 'bg-blue-200' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                    {slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedSlot && (
          <button onClick={handleBooking} className="mt-4">Confirm Booking</button>
        )}

        {message && <p className="mt-4 text-blue-600">{message}</p>}
      </div>
    </div>
  );
}
