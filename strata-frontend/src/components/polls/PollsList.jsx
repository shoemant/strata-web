'use client';

import PollCard from '@/components/polls/PollCard';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function PollsList({
  now,
  polls,
  myVotes,
  results,
  userId,
  onChanged,
}) {
  if (!polls?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No polls yet</CardTitle>
          <CardDescription>
            When a manager or designated owner creates a poll, it’ll show up
            here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          now={now}
          myVotes={myVotes}
          results={results}
          userId={userId}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}
