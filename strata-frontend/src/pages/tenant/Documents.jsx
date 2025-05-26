import TenantNavBar from '../../components/TenantNavBar';

export default function TenantDocuments() {
  return (
    <div>
      <TenantNavBar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Documents</h1>
        <p className="text-gray-700">Here you can access and view uploaded strata documents like bylaws, notices, and minutes.</p>
      </div>
    </div>
  );
}