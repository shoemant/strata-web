'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { confirm } from '@/lib/confirm';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import ElevatorBookingForm from '@/components/ElevatorBookingForm';

const AMENITIES_BUCKET = 'amenities';

export default function ManagerResourcesPage() {
  const { id: rawId } = useParams();
  const buildingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const supabase = useSupabaseClient();
  const user = useUser();

  const [resources, setResources] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // dialog state
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

  const fetchTypesAndResources = async () => {
    setLoading(true);

    // 1) Fetch all resource_types (used for headers & labels)
    const { data: typeRows, error: typeErr } = await supabase
      .from('resource_types')
      .select('id, name')
      .order('name', { ascending: true });

    if (typeErr) {
      console.error('Failed to load resource_types:', typeErr);
      setTypes([]);
    } else {
      setTypes(typeRows || []);
      const elev = (typeRows || []).find((t) => t.name === 'Elevator');
      setElevatorTypeId(elev?.id ?? null);
    }

    // 2) Fetch resources for this building
    const { data: resRows, error: resErr } = await supabase
      .from('resources')
      .select(
        'id, name, is_active, total_spots, booking_interval_minutes, image_path, type_id'
      )
      .eq('building_id', buildingId)
      .order('name', { ascending: true });

    if (resErr) {
      console.error(resErr);
      setResources([]);
    } else {
      const withUrls = (resRows || []).map((r) => ({
        ...r,
        imageUrl: r.image_path ? toPublicUrl(r.image_path) : null,
      }));
      setResources(withUrls);
    }

    setLoading(false);
  };

  const toggleActive = async (id, value) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: value } : r))
    );
    const { error } = await supabase
      .from('resources')
      .update({ is_active: value })
      .eq('id', id);
    if (error) {
      console.error(error);
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !value } : r))
      );
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Really delete this resource?'))) return;
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) console.error(error);
    fetchTypesAndResources();
  };

  const openForm = (resourceId = null) => {
    setInitialResourceId(resourceId);
    setOpenBooking(true);
  };

  // Map type_id → name (fallback to "Other")
  const typeNameById = useMemo(() => {
    const m = new Map(types.map((t) => [t.id, t.name]));
    return (id) => m.get(id) ?? 'Other';
  }, [types]);

  // Group resources by type name; only include types that have resources
  const grouped = useMemo(() => {
    const g = new Map();
    for (const r of resources) {
      const typeName = typeNameById(r.type_id);
      if (!g.has(typeName)) g.set(typeName, []);
      g.get(typeName).push(r);
    }
    for (const [, arr] of g) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resources, typeNameById]);

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="absolute top-16 bottom-0 left-0 md:left-16 right-0 overflow-auto bg-background">
      <main className="p-6 space-y-6">
        {/* Header + CTAs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" asChild>
            <Link href={`/manager/buildings/${buildingId}/resources`}>
              Back to reservations
            </Link>
          </Button>

          <Button asChild>
            <Link href={`/manager/buildings/${buildingId}/resources/new`}>
              Create an amenity
            </Link>
          </Button>
        </div>

        {/* Grouped sections */}
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources yet.</p>
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

                {/* Cards grid for this type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((r) => {
                    const isElevator =
                      !!elevatorTypeId && r.type_id === elevatorTypeId;

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
                              priority={false}
                            />
                          </div>
                        )}

                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center w-full gap-4">
                            <CardTitle className="truncate">
                              {r.name}
                              {isElevator && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (Elevator)
                                </span>
                              )}
                            </CardTitle>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Active
                              </span>
                              <Switch
                                checked={r.is_active}
                                onCheckedChange={(val) =>
                                  toggleActive(r.id, val)
                                }
                              />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="flex justify-between items-center pt-0">
                          <p className="text-sm text-muted-foreground">
                            {r.total_spots} spots · {r.booking_interval_minutes}
                            -min slots
                          </p>

                          <div className="space-x-2 shrink-0">
                            {isElevator && r.is_active && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openForm(r.id)}
                              >
                                Book
                              </Button>
                            )}

                            <Button variant="outline" size="sm" asChild>
                              <Link
                                href={`/manager/buildings/${buildingId}/resources/${r.id}`}
                              >
                                Edit
                              </Link>
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(r.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Light spacing between sections */}
                {idx < grouped.length - 1 && <div className="mt-8" />}
              </section>
            ))}
          </div>
        )}

        {/* Booking dialog */}
        <Dialog open={openBooking} onOpenChange={setOpenBooking}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Elevator booking</DialogTitle>
            </DialogHeader>

            <ElevatorBookingForm
              supabase={supabase}
              buildingId={buildingId}
              // initialResourceId={initialResourceId}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
