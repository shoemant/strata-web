'use client';

import { useMemo, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import VoteForm from '@/components/polls/VoteForm';
import ResultsBlock from '@/components/polls/ResultsBlock';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function isClosed(poll) {
  if (!poll?.expires_at) return false;
  return new Date(poll.expires_at).getTime() <= Date.now();
}

function isOpen(poll) {
  const start = poll?.starts_at ? new Date(poll.starts_at).getTime() : null;
  const end = poll?.expires_at ? new Date(poll.expires_at).getTime() : null;
  const now = Date.now();
  if (start && now < start) return false;
  if (end && now >= end) return false;
  return true;
}

export default function PollCard({
  poll,
  myVotes,
  results,
  userId,
  onChanged,
}) {
  const supabase = useSupabaseClient();
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [options, setOptions] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const closed = useMemo(() => isClosed(poll), [poll]);
  const open = useMemo(() => isOpen(poll), [poll]);

  const mySelectedOptionIds = useMemo(() => {
    return (myVotes || [])
      .filter((v) => v.poll_id === poll.id)
      .map((v) => v.option_id);
  }, [myVotes, poll.id]);

  const pollResults = useMemo(() => {
    return (results || []).filter((r) => r.poll_id === poll.id);
  }, [results, poll.id]);

  async function ensureOptionsLoaded() {
    if (options?.length) return;
    setLoadingOptions(true);
    try {
      const { data, error } = await supabase
        .from('poll_options')
        .select('id, poll_id, label, sort_order, created_at')
        .eq('poll_id', poll.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function onToggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next) await ensureOptionsLoaded();
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{poll.title}</CardTitle>
            {poll.description ? (
              <CardDescription>{poll.description}</CardDescription>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {open ? (
              <Badge>Open</Badge>
            ) : closed ? (
              <Badge variant="secondary">Closed</Badge>
            ) : (
              <Badge variant="secondary">Scheduled</Badge>
            )}
            {poll.allow_anonymous ? (
              <Badge variant="outline">Anonymous</Badge>
            ) : (
              <Badge variant="outline">Not anonymous</Badge>
            )}
            {poll.allow_multiple ? (
              <Badge variant="outline">Multi ({poll.max_choices} max)</Badge>
            ) : (
              <Badge variant="outline">Single choice</Badge>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {poll.expires_at ? (
            <>Closes: {new Date(poll.expires_at).toLocaleString()}</>
          ) : (
            <>No expiry</>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button variant="outline" onClick={onToggleExpand}>
          {expanded ? 'Hide' : 'View & vote'}
        </Button>

        {expanded ? (
          <>
            <Separator />

            <VoteForm
              poll={poll}
              options={options}
              loadingOptions={loadingOptions}
              selectedOptionIds={mySelectedOptionIds}
              userId={userId}
              onChanged={onChanged}
            />

            <Separator />

            <ResultsBlock poll={poll} options={options} results={pollResults} />
          </>
        ) : null}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        {mySelectedOptionIds?.length ? (
          <>Your vote is recorded.</>
        ) : (
          <>You haven’t voted on this poll yet.</>
        )}
      </CardFooter>
    </Card>
  );
}
