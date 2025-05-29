import { Suspense } from 'react';
import SelectBuildingClient from './SelectBuildingClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading buildings...</div>}>
      <SelectBuildingClient />
    </Suspense>
  );
}
