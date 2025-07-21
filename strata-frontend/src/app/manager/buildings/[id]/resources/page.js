'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useParams } from 'next/navigation';
import { confirm } from '@/lib/confirm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function ManagerResourcesPage() {
    const { id: buildingId } = useParams();
    const supabase = useSupabaseClient();
    const user = useUser();

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && buildingId) fetchResources();
    }, [user, buildingId]);

    const fetchResources = async () => {
        const { data, error } = await supabase
            .from('resources')
            .select('id, name, is_active, total_spots, booking_interval_minutes')
            .eq('building_id', buildingId);

        if (error) console.error(error);
        setResources(data || []);
        setLoading(false);
    };

    const toggleActive = async (id, value) => {
        await supabase.from('resources').update({ is_active: value }).eq('id', id);
        fetchResources();
    };

    const handleDelete = async (id) => {
        if (!(await confirm('Really delete this resource?'))) return;
        await supabase.from('resources').delete().eq('id', id);
        fetchResources();
    };

    if (loading) return <p className="p-6">Loading…</p>;

    return (
        <main className="p-6 space-y-6">
            {/* Header and New Resource Button */}
            <div>
                <h1 className="text-2xl font-semibold mb-4">Manage Amenities</h1>
                <Button asChild>
                    <Link href={`/manager/buildings/${buildingId}/resources/new`}>+ New Resource</Link>
                </Button>
            </div>

            {/* Empty state or grid of resources */}
            {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resources yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {resources.map((r) => (
                        <Card key={r.id} className="hover:shadow-lg transition">
                            <CardHeader>
                                <div className="flex justify-between items-center w-full">
                                    <CardTitle>{r.name}</CardTitle>
                                    <Switch
                                        checked={r.is_active}
                                        onCheckedChange={(val) => toggleActive(r.id, val)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">
                                    {r.total_spots} spots · {r.booking_interval_minutes}-min slots
                                </p>
                                <div className="space-x-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/manager/buildings/${buildingId}/resources/${r.id}`}>Edit</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)}>
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </main>
    );
}
