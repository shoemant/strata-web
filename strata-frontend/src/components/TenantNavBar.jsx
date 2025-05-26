import { useNavigate } from 'react-router-dom';

export default function TenantNavBar() {
  const navigate = useNavigate();
  return (
    <nav className="bg-gray-800 text-white p-4 flex gap-4">
      <button onClick={() => navigate('/tenant/bookings')} className="hover:underline">Bookings</button>
      <button onClick={() => navigate('/tenant/forms')} className="hover:underline">Forms</button>
      <button onClick={() => navigate('/tenant/events')} className="hover:underline">Events</button>
      <button onClick={() => navigate('/tenant/documents')} className="hover:underline">Documents</button>
      <button onClick={() => navigate('/tenant/notifications')} className="hover:underline">Notifications</button>
    </nav>
  );
}