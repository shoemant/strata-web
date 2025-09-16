'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function OwnerMaintenanceRequestPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const params = useParams();
  const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [canSubmit, setCanSubmit] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Verify the user is an owner/tenant of a unit in this building
  useEffect(() => {
    (async () => {
      setCheckingAccess(true);
      setErrorMsg('');
      setSuccessMsg('');

      if (!user?.id || !buildingId) {
        setCanSubmit(false);
        setCheckingAccess(false);
        return;
      }

      // unit_memberships: user must have role owner or tenant on a unit that belongs to this building
      const { data, error } = await supabase
        .from('unit_memberships')
        .select(`
          role,
          units:units!unit_memberships_unit_id_fkey(id, building_id)
        `)
        .eq('user_id', user.id)
        .in('role', ['owner', 'tenant']);

      if (error) {
        console.error('Access check failed:', error);
        setErrorMsg('Could not verify your unit membership for this building.');
        setCanSubmit(false);
      } else {
        const hasMembershipInBuilding = (data || []).some(
          (m) => m?.units?.building_id === buildingId
        );
        setCanSubmit(hasMembershipInBuilding);
        if (!hasMembershipInBuilding) {
          setErrorMsg('You do not have a unit membership in this building.');
        }
      }

      setCheckingAccess(false);
    })();
  }, [user?.id, buildingId, supabase]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user?.id || !buildingId) {
      setErrorMsg('Missing user or building.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('maintenance_requests').insert([
      {
        user_id: user.id,
        building_id: buildingId,
        title: title.trim(),
        description: description.trim(),
        // status, submitted_at, updated_at use table defaults
      },
    ]);

    if (error) {
      console.error('Insert error:', error);
      setErrorMsg('Failed to submit request.');
    } else {
      setSuccessMsg('Request submitted successfully!');
      setTitle('');
      setDescription('');
    }
    setSubmitting(false);
  }

  return (
    <ProtectedRoute allowedRoles={['owner', 'tenant']}>
      <div className="absolute inset-y-0 left-16 right-0 bg-background p-6 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Submit Maintenance Request</h1>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTitle>Problem</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {successMsg && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Describe the issue</CardTitle>
            <CardDescription>Be as specific as possible to help us resolve it faster.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Leaking sink in kitchen"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={!canSubmit || checkingAccess}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Describe the problem, location, and any access instructions."
                  className="min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={!canSubmit || checkingAccess}
                />
              </div>
            </CardContent>

            <CardFooter className="justify-end">
              <Button type="submit" disabled={!canSubmit || submitting || checkingAccess}>
                {(submitting || checkingAccess) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {checkingAccess ? 'Checking…' : submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
