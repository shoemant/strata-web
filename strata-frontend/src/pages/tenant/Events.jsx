import TenantNavBar from '../../components/TenantNavBar';

export default function TenantEvents() {
  return (
    <div>
      <TenantNavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Events</h1>
        <p className="text-gray-700">This is where tenants can view upcoming strata events and calendar items.</p>
      </div>
    </div>
  );
}