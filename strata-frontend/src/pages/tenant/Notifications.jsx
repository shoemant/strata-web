import TenantNavBar from '../../components/TenantNavBar';

export default function TenantNotifications() {
  return (
    <div>
      <TenantNavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p className="text-gray-700">This is the notifications panel where users can see recent alerts and announcements.</p>
      </div>
    </div>
  );
}
