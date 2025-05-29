// src/components/BookingList.js

export default function BookingList({ bookings }) {
  if (!bookings || bookings.length === 0) {
    return <p>No bookings found.</p>;
  }

  return (
    <ul className="space-y-2">
      {bookings.map((booking) => (
        <li key={booking.id} className="p-4 border rounded shadow-sm">
          <p>
            <strong>Resource:</strong> {booking.resource_id}
          </p>
          <p>
            <strong>Start:</strong>{' '}
            {new Date(booking.start_time).toLocaleString()}
          </p>
          <p>
            <strong>End:</strong> {new Date(booking.end_time).toLocaleString()}
          </p>
          <p>
            <strong>Status:</strong> {booking.status}
          </p>
        </li>
      ))}
    </ul>
  );
}
