'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import InviteForm from '@/components/manager/invitations/InviteForm';

export default function OwnerInvitePage() {
  const params = useParams();
  const supabase = useSupabaseClient();
  const session = useSession();

  const buildingId = params?.id;

  const [building, setBuilding] = useState(null);
  const [ownedUnits, setOwnedUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState({ ok: null, msg: '' });

  useEffect(() => {
    if (!session?.user?.id || !buildingId) return;

    (async () => {
      setLoading(true);
      setPageStatus({ ok: null, msg: '' });

      const { data: buildingRow, error: buildingErr } = await supabase
        .from('buildings')
        .select('id,name,address')
        .eq('id', buildingId)
        .maybeSingle();

      if (buildingErr) {
        console.error(buildingErr);
        setPageStatus({ ok: false, msg: 'Failed to load building.' });
        setLoading(false);
        return;
      }

      const { data: memberships, error: membershipErr } = await supabase
        .from('unit_memberships')
        .select(
          `
          unit_id,
          role,
          units!unit_memberships_unit_id_fkey(id,label,floor,building_id)
        `
        )
        .eq('user_id', session.user.id)
        .eq('role', 'owner');

      if (membershipErr) {
        console.error(membershipErr);
        setPageStatus({
          ok: false,
          msg: 'Failed to load owner unit membership.',
        });
        setLoading(false);
        return;
      }

      const filteredUnits = (memberships || [])
        .filter((m) => m.units?.building_id === buildingId)
        .map((m) => ({
          id: m.units.id,
          label: m.units.label,
          floor: m.units.floor,
        }));

      if (!filteredUnits.length) {
        setPageStatus({
          ok: false,
          msg: 'You do not own a unit in this building.',
        });
        setLoading(false);
        return;
      }

      setBuilding(buildingRow || null);
      setOwnedUnits(filteredUnits);
      setLoading(false);
    })();
  }, [session, supabase, buildingId]);

  const buildingList = useMemo(() => {
    if (!building) return [];
    return [building];
  }, [building]);

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-0 md:left-16 right-0 bg-background p-6 pt-12">
        <div className="max-w-3xl space-y-6 mt-10 sm:mt-8">
          {pageStatus.ok === false && pageStatus.msg ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {pageStatus.msg}
            </div>
          ) : null}
          {pageStatus.ok === true && pageStatus.msg ? (
            <div className="rounded-md border border-emerald-300/40 bg-emerald-50/40 p-3 text-sm text-emerald-700">
              {pageStatus.msg}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite an owner or tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <InviteForm
                  supabase={supabase}
                  session={session}
                  buildingId={buildingId}
                  buildings={buildingList}
                  actorRole="owner"
                  unitOptionsOverride={ownedUnits}
                  lockBuilding={true}
                  onSuccess={(msg) => {
                    setPageStatus({
                      ok: true,
                      msg: msg || 'Invitation created.',
                    });
                  }}
                  onError={(msg) => {
                    setPageStatus({
                      ok: false,
                      msg: msg || 'Failed to create invite.',
                    });
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
