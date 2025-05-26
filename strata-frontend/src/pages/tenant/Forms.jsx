import TenantNavBar from '../../components/TenantNavBar';

export default function TenantForms() {
  return (
    <div>
      <TenantNavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Forms</h1>
        <p className="text-gray-700">This is the forms page for submitting move-in/out requests, fob purchases, and more.</p>
      </div>
    </div>
  );
}