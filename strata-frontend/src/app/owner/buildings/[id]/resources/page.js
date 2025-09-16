'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import ElevatorBookingForm from '@/components/ElevatorBookingForm';

const AMENITIES_BUCKET = 'amenities';

export default function OwnerResourcesPage() {
  const { id: rawId } = useParams();
  const buildingId = Array.isArray(rawId) ? rawId[0] : rawId;

  const supabase = useSupabaseClient();
  const user = useUser();

  const [resources, setResources] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // booking dialog
  const [openBooking, setOpenBooking] = useState(false);
  const [initialResourceId, setInitialResourceId] = useState(null);

  // cache the "Elevator" type id
  const [elevatorTypeId, setElevatorTypeId] = useState(null);

  useEffect(() => {
    if (user && buildingId) {
      fetchTypesAndResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, buildingId]);

  const toPublicUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(AMENITIES_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  async function fetchTypesAndResources() {
    setLoading(true);

    // 1) resource types
    const { data: typeRows, error: typeErr } = await supabase
      .from('resource_types')
      .select('id, name')
      .order('name', { ascending: true });

    if (typeErr) {
      console.error('Failed to load resource_types:', typeErr);
      setTypes([]);
      setElevatorTypeId(null);
    } else {
      setTypes(typeRows || []);
      const elev = (typeRows || []).find((t) => t.name === 'Elevator');
      setElevatorTypeId(elev?.id ?? null);
    }

    // 2) resources for this building
    const { data: resRows, error: resErr } = await supabase
      .from('resources')
      .select('id, name, is_active, total_spots, booking_interval_minutes, image_path, type_id')
      .eq('building_id', buildingId)
      .order('name', { ascending: true });

    if (resErr) {
      console.error('Failed to load resources:', resErr);
      setResources([]);
    } else {
      const withUrls = (resRows || []).map((r) => ({
        ...r,
        imageUrl: r.image_path ? toPublicUrl(r.image_path) : null,
      }));
      setResources(withUrls);
    }

    setLoading(false);
  }

  const openElevatorBooking = (resourceId) => {
    setInitialResourceId(resourceId);
    setOpenBooking(true);
  };

  // Map type id → name
  const typeNameById = useMemo(() => {
    const m = new Map(types.map((t) => [t.id, t.name]));
    return (id) => m.get(id) ?? 'Other';
  }, [types]);

  // Group resources by type name
  const grouped = useMemo(() => {
    const g = new Map();
    for (const r of resources) {
      const typeName = typeNameById(r.type_id);
      if (!g.has(typeName)) g.set(typeName, []);
      g.get(typeName).push(r);
    }
    for (const [k, arr] of g) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resources, typeNameById]);

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <ProtectedRoute allowedRoles={['owner', 'tenant']}>
      <main className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Amenities</h1>
          {/* No "New Resource" here (owner view) */}
        </div>

        {/* Grouped sections */}
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No amenities available.</p>
        ) : (
          <div className="space-y-10">
            {grouped.map(([typeName, items], idx) => (
              <section key={typeName}>
                {/* Type header */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">{typeName}</h2>
                  <span className="text-sm text-muted-foreground">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Separator className="mb-4" />

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((r) => {
                    const isElevator = !!elevatorTypeId && r.type_id === elevatorTypeId;
                    const active = !!r.is_active;

                    return (
                      <Card key={r.id} className="hover:shadow-lg transition">
                        {r.imageUrl && (
                          <div className="relative w-full h-40 rounded-t-lg overflow-hidden bg-muted">
                            <Image
                              src={r.imageUrl}
                              alt={r.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
                          </div>
                        )}

                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-4">
                            <CardTitle className="truncate">{r.name}</CardTitle>
                            {active ? (
                              <Badge variant="outline">Available</Badge>
                            ) : (
                              <Badge variant="secondary">Unavailable</Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="flex items-center justify-between pt-0">
                          <p className="text-sm text-muted-foreground">
                            {r.total_spots} spots · {r.booking_interval_minutes}-min slots
                          </p>
                          <div className="space-x-2 shrink-0">
                            {active ? (
                              isElevator ? (
                                <Button size="sm" onClick={() => openElevatorBooking(r.id)}>
                                  Book
                                </Button>
                              ) : (
                                <Button asChild size="sm" variant="default">
                                  {/* adjust if your per-resource booking page has a different route */}
                                  <Link href={`/owner/buildings/${buildingId}/resources/${r.id}`}>View / Book</Link>
                                </Button>
                              )
                            ) : (
                              <Button size="sm" variant="ghost" disabled>
                                Not available
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {idx < grouped.length - 1 && <div className="mt-8" />}
              </section>
            ))}
          </div>
        )}

        {/* Elevator booking dialog (only used for Elevator resources) */}
        <Dialog open={openBooking} onOpenChange={setOpenBooking}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Elevator booking</DialogTitle>
            </DialogHeader>

            <ElevatorBookingForm
              supabase={supabase}
              buildingId={buildingId}
              initialResourceId={initialResourceId ?? undefined}
            />
          </DialogContent>
        </Dialog>
      </main>
    </ProtectedRoute>
  );
}
