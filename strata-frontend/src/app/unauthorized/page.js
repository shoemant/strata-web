'use client';

import LogoutButton from '@/components/LogoutButton';
import { AlertCircle } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Unauthorized</h1>
          <p className="text-muted-foreground mt-2">
            You do not have permission to view this page with your current
            account.
          </p>
        </div>

        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
