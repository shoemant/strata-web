'use client';

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

export default function ResultsBlock({
  poll,
  options,
  results,
  canShowResults,
}) {
  const countsByOption = useMemo(() => {
    const map = new Map();
    (results || []).forEach((r) =>
      map.set(r.option_id, Number(r.vote_count || 0))
    );
    return map;
  }, [results]);

  const total = useMemo(() => {
    let sum = 0;
    (options || []).forEach((o) => {
      sum += countsByOption.get(o.id) || 0;
    });
    return sum;
  }, [options, countsByOption]);

  if (!canShowResults) {
    return (
      <div className="text-sm text-muted-foreground">
        Results will be visible after the poll closes.
      </div>
    );
  }

  // Results are allowed, but there may be zero votes.
  if (total === 0) {
    return <div className="text-sm text-muted-foreground">No votes yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Results</div>

      <div className="space-y-3">
        {(options || []).map((o) => {
          const count = countsByOption.get(o.id) || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={o.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div>{o.label}</div>
                <div className="text-muted-foreground">
                  {count} ({pct}%)
                </div>
              </div>
              <Progress value={pct} />
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        Total votes: {total}
        {poll.allow_anonymous ? ' • Anonymous poll' : ''}
      </div>
    </div>
  );
}
