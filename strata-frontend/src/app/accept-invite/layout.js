'use client';
import { Suspense } from 'react';

export default function AcceptInviteLayout({ children }) {
    return <Suspense fallback={<div>Loading invite page...</div>}>{children}</Suspense>;
}
