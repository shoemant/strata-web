'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import PollsHeader from '@/components/polls/PollsHeader';
import PollsList from '@/components/polls/PollsList';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function PollsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [buildingId, setBuildingId] = useState(null);
  const [buildingName, setBuildingName] = useState(null);

  const [canCreate, setCanCreate] = useState(false);

  const [polls, setPolls] = useState([]);
  const [myVotes, setMyVotes] = useState([]); // rows from poll_votes (own only)
  const [results, setResults] = useState([]); // rows from v_poll_results
  const [error, setError] = useState(null);

  const now = useMemo(() => new Date(), []);

  async function loadAll() {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // 1) Get user's profile -> building_id
      const { data: profile, error: pErr } = await supabase
        .from('user_profiles')
        .select('id, building_id')
        .eq('id', userId)
        .maybeSingle();

      if (pErr) throw pErr;

      const bid = profile?.building_id || null;
      setBuildingId(bid);

      if (!bid) {
        setBuildingName(null);
        setPolls([]);
        setMyVotes([]);
        setResults([]);
        setCanCreate(false);
        return;
      }

      // 2) Building name
      const { data: b, error: bErr } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', bid)
        .maybeSingle();

      if (bErr) throw bErr;
      setBuildingName(b?.name || null);

      // 3) Can create?
      const { data: can, error: canErr } = await supabase.rpc(
        'can_create_polls',
        { _building_id: bid }
      );
      if (canErr) throw canErr;
      setCanCreate(Boolean(can));

      // 4) Load polls in building
      const { data: pollsData, error: pollsErr } = await supabase
        .from('polls')
        .select(
          'id, building_id, created_by, title, description, starts_at, expires_at, allow_anonymous, allow_multiple, max_choices, show_results_before_close, created_at, updated_at'
        )
        .eq('building_id', bid)
        .order('created_at', { ascending: false });

      if (pollsErr) throw pollsErr;
      setPolls(pollsData || []);

      // 5) Load my votes (RLS: only my own)
      const { data: myVotesData, error: mvErr } = await supabase
        .from('poll_votes')
        .select('id, poll_id, option_id, created_at')
        .eq('voter_id', userId);

      if (mvErr) throw mvErr;
      setMyVotes(myVotesData || []);

      // 6) Load results (view respects show_results_before_close & expiry)
      const { data: resultsData, error: rErr } = await supabase
        .from('v_poll_results')
        .select('poll_id, option_id, option_label, vote_count');

      if (rErr) throw rErr;
      setResults(resultsData || []);
    } catch (e) {
      setError(e?.message || 'Failed to load polls.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userId]);

  if (!session) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Polls & Votes</CardTitle>
            <CardDescription>
              You must be signed in to view polls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')}>Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    // Full-width container; layout/sidebar should handle the left navbar offset.
    <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 overflow-auto">
      <div className="w-full px-6 pt-0 pb-6 space-y-6">
        <PollsHeader
          loading={loading}
          buildingName={buildingName}
          canCreate={canCreate}
          buildingId={buildingId}
          onCreated={loadAll}
          onRefresh={loadAll}
        />

        {loading ? (
          <Card className="w-full">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : !buildingId ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No building assigned</CardTitle>
              <CardDescription>
                Your account isn’t linked to a building yet, so there are no
                polls to show.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <PollsList
            now={now}
            polls={polls}
            myVotes={myVotes}
            results={results}
            userId={userId}
            canCreate={canCreate}
            onChanged={loadAll}
          />
        )}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
    </main>
  );
}
