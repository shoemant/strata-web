'use client';

import { Button } from '@/components/ui/button';

export default function CreatePollButton({
  canCreate,
  buildingId,
  loading = false,
  onClick,
  label = 'Create poll',
  className = '',
}) {
  if (loading) return null;
  if (!canCreate) return null;
  if (!buildingId) return null;

  return (
    <Button type="button" className={className} onClick={onClick}>
      {label}
    </Button>
  );
}
