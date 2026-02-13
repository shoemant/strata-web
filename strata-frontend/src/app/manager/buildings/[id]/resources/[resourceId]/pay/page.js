'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function formatMoneyFromCents(cents) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

export default function ManagerPayPage() {
  const params = useParams();
  const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const resourceId = Array.isArray(params?.resourceId)
    ? params.resourceId[0]
    : params?.resourceId;

  const sp = useSearchParams();
  const router = useRouter();
  const supabase = useSupabaseClient();

  const date = sp.get('date');
  const startTime = sp.get('startTime');
  const userId = sp.get('userId');

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load resource info (name + price)
  useEffect(() => {
    if (!resourceId || !buildingId) return;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('resources')
        .select('id, name, cost_cents, is_paid')
        .eq('id', resourceId)
        .eq('building_id', buildingId)
        .single();

      if (error) {
        console.error(error);
        setResource(null);
      } else {
        setResource(data);
      }

      setLoading(false);
    })();
  }, [resourceId, buildingId, supabase]);

  function handleFakePayment() {
    // 🚨 TEMPORARY placeholder
    // Later you will replace this with Stripe Checkout redirect
    alert('Stripe payment will go here.');

    // Example redirect back
    router.push(
      `/manager/buildings/${buildingId}/resources/${resourceId}/book`
    );
  }

  if (loading) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6">
        <Skeleton className="h-32 w-full" />
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6">
        <p className="text-sm text-red-600">Could not load payment page.</p>
      </main>
    );
  }

  return (
    <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Complete Payment</CardTitle>
            <Badge variant="secondary">Stripe</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Amenity</div>
            <div className="font-medium">{resource.name}</div>

            <div className="text-sm text-muted-foreground mt-2">Date</div>
            <div>{date || '—'}</div>

            <div className="text-sm text-muted-foreground mt-2">Time</div>
            <div>{startTime || '—'}</div>

            <div className="text-sm text-muted-foreground mt-4">Total</div>
            <div className="text-lg font-semibold">
              {formatMoneyFromCents(resource.cost_cents)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="w-full" onClick={handleFakePayment}>
              Pay with Stripe
            </Button>

            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            You will be redirected to Stripe to securely complete payment.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
