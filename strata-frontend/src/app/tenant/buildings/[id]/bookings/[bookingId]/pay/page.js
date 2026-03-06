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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function OwnerPayPage() {
  const params = useParams();

  // ✅ matches folder: /owner/buildings/[id]/bookings/[bookingId]/pay
  const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const bookingId = Array.isArray(params?.bookingId)
    ? params.bookingId[0]
    : params?.bookingId;

  // bookingId == resourceId in your owner flow
  const resourceId = bookingId;

  const sp = useSearchParams();
  const router = useRouter();
  const supabase = useSupabaseClient();

  // Passed from booking page
  const date = sp.get('date');
  const startTime = sp.get('startTime');
  const userId = sp.get('userId');

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!buildingId || !resourceId) return;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from('resources')
        .select('id, name, is_paid, cost_cents, building_id')
        .eq('id', resourceId)
        .eq('building_id', buildingId)
        .single();

      if (error) {
        console.error(error);
        setResource(null);
        setErr('Could not load payment details.');
      } else {
        setResource(data);
      }

      setLoading(false);
    })();
  }, [buildingId, resourceId, supabase]);

  function handleFakePayment() {
    alert('Stripe payment will go here.');

    // ✅ back to the booking page you actually use
    router.push(`/owner/buildings/${buildingId}/bookings/${bookingId}/book`);
  }

  if (loading) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
        <Skeleton className="h-32 w-full max-w-xl" />
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
        <p className="text-sm text-red-600">{err || 'Not found.'}</p>
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

            {!resource.is_paid && (
              <p className="text-xs text-muted-foreground mt-2">
                This amenity is marked as free. If you reached this page by
                mistake, go back and try again.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="w-full"
              onClick={handleFakePayment}
              disabled={!resource.is_paid}
            >
              Pay with Stripe
            </Button>

            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            You will be redirected to Stripe to securely complete payment.
          </p>

          {userId ? (
            <p className="text-[11px] text-muted-foreground">
              Booking for user: <span className="font-mono">{userId}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
