// src/app/manager/select-building/page.js
import { Suspense } from 'react';
import SelectBuildingClient from './SelectBuildingClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectBuildingClient />
    </Suspense>
  );
}
