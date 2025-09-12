'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function MaintenanceRequestPage() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [buildingId, setBuildingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('building_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch building:', error);
        setErrorMsg('Failed to find your building.');
      } else {
        setBuildingId(data?.building_id || null);
      }
    };

    fetchProfile();
  }, [user?.id, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim() || !description.trim() || !buildingId || !user?.id) {
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
  };

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
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
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={submitting || !buildingId}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
