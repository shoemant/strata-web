'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import InviteTenantForm from '@/components/InviteTenantForm';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function InviteTenantPage() {
    const supabase = useSupabaseClient();
    const user = useUser();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            setLoading(true);
            setErr('');

            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, building_id')
                .eq('id', user.id)
                .single();

            if (error) {
                setErr('Failed to load profile.');
                setProfile(null);
            } else {
                setProfile(data);
            }
            setLoading(false);
        };

        fetchProfile();
    }, [user?.id, supabase]);

    return (
        <ProtectedRoute allowedRoles={['owner']}>
            <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
                <h1 className="text-2xl font-bold tracking-tight">Invite a Tenant</h1>

                {loading ? (
                    <Skeleton className="h-64 w-full" />
                ) : err ? (
                    <Alert variant="destructive">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{err}</AlertDescription>
                    </Alert>
                ) : !profile?.building_id ? (
                    <Alert variant="destructive">
                        <AlertTitle>No building assigned</AlertTitle>
                        <AlertDescription>
                            You must be assigned to a building before inviting a tenant.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Send an invitation</CardTitle>
                            <CardDescription>
                                The tenant will receive an email with a unique link to join your building.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InviteTenantForm ownerId={profile.id} buildingId={profile.building_id} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    );
}
