'use client';

import { useMemo, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export default function CreatePollDialog({ buildingId, onCreated }) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [expiresAtLocal, setExpiresAtLocal] = useState(''); // datetime-local (optional)

  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [maxChoices, setMaxChoices] = useState(2);
  const [showResultsBeforeClose, setShowResultsBeforeClose] = useState(true);

  const [options, setOptions] = useState(['Yes', 'No']);

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    const nonEmpty = options.map((o) => o.trim()).filter(Boolean);
    if (nonEmpty.length < 2) return false;
    if (allowMultiple && (!maxChoices || maxChoices < 1)) return false;
    if (allowMultiple && maxChoices > nonEmpty.length) return false;
    return true;
  }, [title, options, allowMultiple, maxChoices]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setExpiresAtLocal('');
    setAllowAnonymous(false);
    setAllowMultiple(false);
    setMaxChoices(2);
    setShowResultsBeforeClose(true);
    setOptions(['Yes', 'No']);
    setErr(null);
  }

  function updateOption(i, val) {
    setOptions((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  }

  function removeOption(i) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  async function handleCreate() {
    setSaving(true);
    setErr(null);

    try {
      if (!userId) throw new Error('Not signed in.');
      if (!buildingId) throw new Error('No building selected.');

      const cleanedOptions = options.map((o) => o.trim()).filter(Boolean);
      if (cleanedOptions.length < 2) throw new Error('Add at least 2 options.');
      if (allowMultiple && maxChoices > cleanedOptions.length) {
        throw new Error('Max choices cannot exceed number of options.');
      }

      const expires_at = expiresAtLocal
        ? new Date(expiresAtLocal).toISOString()
        : null;

      const pollPayload = {
        building_id: buildingId,
        created_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        expires_at,
        allow_anonymous: allowAnonymous,
        allow_multiple: allowMultiple,
        max_choices: allowMultiple ? Number(maxChoices) : null,
        show_results_before_close: showResultsBeforeClose,
      };

      const { data: poll, error: pErr } = await supabase
        .from('polls')
        .insert(pollPayload)
        .select('id')
        .single();

      if (pErr) throw pErr;

      const optionRows = cleanedOptions.map((label, idx) => ({
        poll_id: poll.id,
        label,
        sort_order: idx,
      }));

      const { error: oErr } = await supabase
        .from('poll_options')
        .insert(optionRows);
      if (oErr) throw oErr;

      setOpen(false);
      resetForm();
      await onCreated?.();
    } catch (e) {
      setErr(e?.message || 'Failed to create poll.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>Create poll</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a poll</DialogTitle>
          <DialogDescription>
            Configure voting rules and add options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Approve budget proposal?"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context for residents…"
            />
          </div>

          <div className="space-y-2">
            <Label>Expiry (optional)</Label>
            <Input
              type="datetime-local"
              value={expiresAtLocal}
              onChange={(e) => setExpiresAtLocal(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              Leave blank for no expiry.
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Anonymous voting</div>
                <div className="text-xs text-muted-foreground">
                  Results show totals only.
                </div>
              </div>
              <Switch
                checked={allowAnonymous}
                onCheckedChange={setAllowAnonymous}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Show results before close
                </div>
                <div className="text-xs text-muted-foreground">
                  If off, results appear after expiry.
                </div>
              </div>
              <Switch
                checked={showResultsBeforeClose}
                onCheckedChange={setShowResultsBeforeClose}
              />
            </div>

            <div className="flex items-center justify-between gap-3 md:col-span-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Allow multiple selections
                </div>
                <div className="text-xs text-muted-foreground">
                  Residents can choose more than one option.
                </div>
              </div>
              <Switch
                checked={allowMultiple}
                onCheckedChange={(v) => {
                  setAllowMultiple(v);
                  if (!v) setMaxChoices(2);
                }}
              />
            </div>

            {allowMultiple ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Max choices</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxChoices}
                  onChange={(e) => setMaxChoices(Number(e.target.value))}
                />
                <div className="text-xs text-muted-foreground">
                  Must be ≤ number of options.
                </div>
              </div>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Options</div>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  <Button
                    variant="outline"
                    onClick={() => removeOption(idx)}
                    disabled={options.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addOption}>
                Add option
              </Button>
            </div>
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSave || saving}>
            {saving ? 'Creating…' : 'Create poll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
