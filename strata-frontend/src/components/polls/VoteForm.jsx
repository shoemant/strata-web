'use client';

import { useMemo, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function VoteForm({
  poll,
  options,
  loadingOptions,
  selectedOptionIds,
  userId,
  onChanged,
}) {
  const supabase = useSupabaseClient();
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const isClosed = useMemo(() => {
    if (!poll?.expires_at) return false;
    return new Date(poll.expires_at).getTime() <= Date.now();
  }, [poll?.expires_at]);

  const [singleChoice, setSingleChoice] = useState(
    () => selectedOptionIds?.[0] || ''
  );
  const [multiChoice, setMultiChoice] = useState(
    () => new Set(selectedOptionIds || [])
  );

  const maxChoices = poll.allow_multiple ? poll.max_choices : 1;

  function toggleMulti(id) {
    setMultiChoice((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= maxChoices) return next; // silently ignore extra
        next.add(id);
      }
      return next;
    });
  }

  async function submitVote() {
    setSubmitting(true);
    setLocalError(null);

    try {
      if (!userId) throw new Error('Not signed in.');
      if (isClosed) throw new Error('This poll is closed.');

      const chosen = poll.allow_multiple
        ? Array.from(multiChoice)
        : singleChoice
          ? [singleChoice]
          : [];

      if (!chosen.length) throw new Error('Select an option first.');

      // Replace my vote(s): delete my existing votes for this poll, then insert new ones.
      const { error: delErr } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('voter_id', userId);

      if (delErr) throw delErr;

      const rows = chosen.map((optionId) => ({
        poll_id: poll.id,
        option_id: optionId,
        voter_id: userId,
      }));

      const { error: insErr } = await supabase.from('poll_votes').insert(rows);
      if (insErr) throw insErr;

      await onChanged?.();
    } catch (e) {
      setLocalError(e?.message || 'Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions)
    return (
      <div className="text-sm text-muted-foreground">Loading options…</div>
    );
  if (!options?.length)
    return (
      <div className="text-sm text-muted-foreground">No options available.</div>
    );

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Cast your vote</div>

      {poll.allow_multiple ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Choose up to {maxChoices}.
          </div>

          <div className="space-y-2">
            {options.map((o) => {
              const checked = multiChoice.has(o.id);
              return (
                <div key={o.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`opt-${o.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleMulti(o.id)}
                    disabled={submitting || isClosed}
                  />
                  <Label htmlFor={`opt-${o.id}`} className="cursor-pointer">
                    {o.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <RadioGroup
          value={singleChoice}
          onValueChange={setSingleChoice}
          className="space-y-2"
        >
          {options.map((o) => (
            <div key={o.id} className="flex items-center space-x-2">
              <RadioGroupItem
                value={o.id}
                id={`opt-${o.id}`}
                disabled={submitting || isClosed}
              />
              <Label htmlFor={`opt-${o.id}`} className="cursor-pointer">
                {o.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {localError ? (
        <div className="text-sm text-red-600">{localError}</div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button onClick={submitVote} disabled={submitting || isClosed}>
          {submitting ? 'Submitting…' : 'Submit vote'}
        </Button>
        {isClosed ? (
          <div className="text-xs text-muted-foreground">Voting is closed.</div>
        ) : null}
      </div>
    </div>
  );
}
