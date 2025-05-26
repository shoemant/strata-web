import TenantNavBar from '../../components/TenantNavBar';

export default function TenantDashboard() {
  return (
    <div>
      <TenantNavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Tenant Dashboard</h1>
        <p className="text-gray-700">Welcome! Please use the navigation bar to access your amenities, forms, documents, and notifications.</p>
      </div>
    </div>
  );
}