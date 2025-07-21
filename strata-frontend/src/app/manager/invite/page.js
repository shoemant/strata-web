'use client';

import React, { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function InviteForm({ buildingId }) {
  const supabase = useSupabaseClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tenant');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = uuidv4();

    const { data: existing } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .eq('building_id', buildingId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      setError('An invitation has already been sent to this email.');
      return;
    }

    const { error: insertError } = await supabase
      .from('invitations')
      .insert([{ email, role, building_id: buildingId, token }]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Email failed to send');
      }

      setSuccess('Invitation sent successfully!');
      setEmail('');
    } catch (err) {
      console.error(err);
      setError('Failed to send email. Please try again.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
        <form onSubmit={handleInvite} className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>Invite User</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email to invite"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full">
                Send Invitation
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </ProtectedRoute>
  );
}
