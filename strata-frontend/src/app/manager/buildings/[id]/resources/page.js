'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { confirm } from '@/lib/confirm';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ✅ make sure this path/name matches your actual component file/export
import ElevatorBookingForm from '@/components/ElevatorBookingForm';
// or: import ElevatorBookingForm from '@/components/ElevatorForm';

const AMENITIES_BUCKET = 'amenities';

export default function ManagerResourcesPage() {
    const { id: rawId } = useParams();
    const buildingId = Array.isArray(rawId) ? rawId[0] : rawId;
    const supabase = useSupabaseClient();
    const user = useUser();

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    // dialog state
    const [openBooking, setOpenBooking] = useState(false);
    const [initialResourceId, setInitialResourceId] = useState(null);

    // cache the "Elevator" type id
    const [elevatorTypeId, setElevatorTypeId] = useState(null);

    useEffect(() => {
        if (user && buildingId) {
            fetchElevatorTypeId().then(fetchResources);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, buildingId]);

    const toPublicUrl = (path) => {
        if (!path) return null;
        const { data } = supabase.storage.from(AMENITIES_BUCKET).getPublicUrl(path);
        return data?.publicUrl ?? null;
    };

    const fetchElevatorTypeId = async () => {
        const { data, error } = await supabase
            .from('resource_types')
            .select('id')
            .eq('name', 'Elevator')
            .maybeSingle();

        if (error) {
            console.error('Failed to get Elevator type id:', error);
            setElevatorTypeId(null);
            return null;
        }
        setElevatorTypeId(data?.id ?? null);
        return data?.id ?? null;
    };

    const fetchResources = async () => {
        setLoading(true);

        // Keep it simple: fetch resources; we’ll compare by type_id
        const { data, error } = await supabase
            .from('resources')
            .select('id, name, is_active, total_spots, booking_interval_minutes, image_path, type_id')
            .eq('building_id', buildingId)
            .order('name', { ascending: true });

        if (error) {
            console.error(error);
            setResources([]);
        } else {
            const withUrls = (data || []).map((r) => ({
                ...r,
                imageUrl: r.image_path ? toPublicUrl(r.image_path) : null,
            }));
            setResources(withUrls);
        }
        setLoading(false);
    };

    const toggleActive = async (id, value) => {
        setResources((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: value } : r)));
        const { error } = await supabase.from('resources').update({ is_active: value }).eq('id', id);
        if (error) {
            console.error(error);
            setResources((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: !value } : r)));
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirm('Really delete this resource?'))) return;
        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) console.error(error);
        fetchResources();
    };

    const anyElevator = !!elevatorTypeId && resources.some((r) => r.type_id === elevatorTypeId);

    const openForm = (resourceId = null) => {
        setInitialResourceId(resourceId);
        setOpenBooking(true);
    };

    if (loading) return <p className="p-6">Loading…</p>;

    return (
        <main className="p-6 space-y-6">
            {/* Header + CTAs */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Manage Amenities</h1>

                {anyElevator && (
                    <Button variant="outline" onClick={() => openForm(null)}>
                        Book elevator
                    </Button>
                )}
            </div>

            <div>
                <Button asChild>
                    <Link href={`/manager/buildings/${buildingId}/resources/new`}>+ New Resource</Link>
                </Button>
            </div>

            {/* Grid */}
            {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resources yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {resources.map((r) => {
                        const isElevator = !!elevatorTypeId && r.type_id === elevatorTypeId;
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
                                            {isElevator && <span className="ml-2 text-xs text-muted-foreground">(Elevator)</span>}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Active</span>
                                            <Switch checked={r.is_active} onCheckedChange={(val) => toggleActive(r.id, val)} />
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex justify-between items-center pt-0">
                                    <p className="text-sm text-muted-foreground">
                                        {r.total_spots} spots · {r.booking_interval_minutes}-min slots
                                    </p>
                                    <div className="space-x-2 shrink-0">
                                        {isElevator && r.is_active && (
                                            <Button variant="default" size="sm" onClick={() => openForm(r.id)}>
                                                Book
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/manager/buildings/${buildingId}/resources/${r.id}`}>Edit</Link>
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
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
                    // If your form supports it, pass the preselected resource:
                    // initialResourceId={initialResourceId}
                    />
                </DialogContent>
            </Dialog>
        </main>
    );
}
