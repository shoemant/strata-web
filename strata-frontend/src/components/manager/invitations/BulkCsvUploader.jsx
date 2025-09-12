'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, FileDown, UploadCloud } from 'lucide-react';

/**
 * CSV columns supported (header row required):
 * - full_name (optional; NOT used for invitation; can help QA)
 * - email (required)
 * - role  (required) -> 'manager' | 'owner' | 'tenant' (admin is ignored for invites)
 * - unit_id (optional) -> takes precedence if present
 * - unit_number (optional) -> fallback to resolve unit by building + number/label
 *
 * For each valid row, inserts into public.invitations and triggers 'send-invite-email'.
 */
export default function BulkInviteCsv({
  supabase,
  buildingId,
  onSuccess,
  onError,
  templateCsv = defaultInviteTemplateCsv,
}) {
  const csvRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });
  const [ingestResult, setIngestResult] = useState(null);

  // small CSV parser (no deps). Assumes simple commas and no quoted commas.
  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      // allow commas inside simple quotes if needed (basic handling)
      const parts = [];
      let curr = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' ) {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          parts.push(curr);
          curr = '';
        } else {
          curr += ch;
        }
      }
      parts.push(curr);
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (parts[i] ?? '').trim()));
      return obj;
    });
    return { headers, rows };
  }

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invite_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pad2 = (n) => n.toString().padStart(2, '0');
  const newToken = () => {
    const d = new Date();
    const ts = `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
    const rand = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 12);
    return `${ts}-${rand}`;
  };

  async function resolveUnitId(buildingId, unit_id, unit_number) {
    if (unit_id) return unit_id;

    const key = (unit_number ?? '').trim();
    if (!key) return null;

    // Try by explicit unit_number, then by label (many people put the label instead)
    const { data, error } = await supabase
      .from('units')
      .select('id, unit_number, label')
      .eq('building_id', buildingId)
      .or(`unit_number.eq.${key},label.eq.${key}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Unit lookup error:', error);
      return null;
    }
    return data?.id ?? null;
  }

  async function createInvitationRow({ email, role, buildingId, unitId, inviterId, expiresAt }) {
    const token = newToken();

    // Only allow roles that invitations table accepts
    const r = (role || '').toLowerCase();
    if (!['manager', 'owner', 'tenant'].includes(r)) {
      return { ok: false, error: `Unsupported role for invitation: ${role}` };
    }

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: email.toLowerCase(),
        role: r,
        building_id: buildingId || null,
        unit_id: unitId || null,
        token,
        invited_by: inviterId ?? null,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error) {
      // 23505 -> unique violation: the partial unique index one_pending_invite_per_user
      const msg = error.code === '23505'
        ? `Pending invite already exists for ${email}`
        : `Failed to invite ${email}`;
      return { ok: false, error: msg, detail: error.message };
    }

    // try to send email (non-blocking failure)
    const { error: sendErr } = await supabase.functions.invoke('send-invite-email', {
      body: { invitation_id: data?.id },
    });
    if (sendErr) {
      console.warn('send-invite-email failed for', email, sendErr);
    }

    return { ok: true };
  }

  async function handleCsvUpload(e) {
    e.preventDefault();
    setStatus({ ok: null, msg: '' });
    setIngestResult(null);

    if (!buildingId) {
      const msg = 'Building not resolved yet.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }

    const file = csvRef.current?.files?.[0];
    if (!file) {
      const msg = 'Please choose a CSV file.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }
    const isCsv =
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      const msg = 'Selected file is not a CSV.';
      setStatus({ ok: false, msg });
      onError?.(msg);
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);

      // Basic header guardrails
      const need = ['email', 'role'];
      const hasAll = need.every(h => headers.includes(h));
      if (!hasAll) {
        const msg = `CSV must include headers: ${need.join(', ')}`;
        setStatus({ ok: false, msg });
        onError?.(msg);
        return;
      }

      const { data: authUser } = await supabase.auth.getUser();
      const inviterId = authUser?.user?.id ?? null;
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      let processed = 0, inserted = 0, skipped = 0;
      const errors = [];

      // Process sequentially to keep rate of function.invoke sane.
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        processed++;

        const email = (r.email || '').trim().toLowerCase();
        const role  = (r.role  || '').trim().toLowerCase();
        const unit_id = (r.unit_id || '').trim();
        const unit_number = (r.unit_number || r.label || '').trim();

        if (!email || !role) {
          skipped++;
          errors.push({ row: i + 2, msg: 'Missing email or role' }); // +2 for header + 1-based
          continue;
        }

        // Resolve unit if needed
        let resolvedUnit = null;
        if (role === 'owner' || role === 'tenant') {
          resolvedUnit = await resolveUnitId(buildingId, unit_id, unit_number);
          if (!resolvedUnit) {
            skipped++;
            errors.push({ row: i + 2, msg: 'Could not resolve unit for owner/tenant' });
            continue;
          }
        }

        const res = await createInvitationRow({
          email, role, buildingId, unitId: resolvedUnit, inviterId, expiresAt
        });

        if (!res.ok) {
          skipped++;
          errors.push({ row: i + 2, msg: res.error });
        } else {
          inserted++;
        }
      }

      const summary = { buildingId, processed, inserted, skipped, errors };
      setIngestResult(summary);

      const okMsg = `Invites processed: ${processed}, created: ${inserted}, skipped: ${skipped}`;
      setStatus({ ok: true, msg: okMsg });
      onSuccess?.(summary, okMsg);
    } catch (err) {
      console.error(err);
      const msg = 'Bulk invite failed.';
      setStatus({ ok: false, msg });
      onError?.(msg);
    } finally {
      setUploading(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button onClick={downloadTemplate} variant="outline" size="sm" className="inline-flex items-center">
          <FileDown className="mr-2 h-4 w-4" />
          Template CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Upload a CSV to create <span className="font-medium">pending invitations</span> for this building and email each invitee.
      </p>

      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" type="file" ref={csvRef} accept=".csv,text/csv" />
        <p className="text-xs text-muted-foreground">
          Headers: <code>full_name,email,role,unit_id,unit_number</code>
          &nbsp;|&nbsp; Roles (invites): <code>manager</code>, <code>owner</code>, <code>tenant</code>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleCsvUpload} disabled={!buildingId || uploading} className="inline-flex items-center">
          <UploadCloud className="mr-2 h-4 w-4" />
          {uploading ? 'Processing…' : 'Upload & Invite'}
        </Button>
        {status.ok === true && (
          <span className="inline-flex items-center text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {status.msg}
          </span>
        )}
        {status.ok === false && (
          <span className="inline-flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {status.msg}
          </span>
        )}
      </div>

      {ingestResult && (
        <div className="mt-4 rounded-md border p-3 text-sm">
          <div className="font-medium mb-2">Invite summary</div>
          <ul className="space-y-1">
            <li><span className="text-muted-foreground">Building:</span> {ingestResult.buildingId}</li>
            <li><span className="text-muted-foreground">Processed:</span> {ingestResult.processed}</li>
            <li><span className="text-muted-foreground">Created:</span> {ingestResult.inserted}</li>
            <li><span className="text-muted-foreground">Skipped:</span> {ingestResult.skipped}</li>
          </ul>
          {ingestResult?.errors?.length ? (
            <div className="mt-2">
              <div className="font-medium">Errors ({ingestResult.errors.length}):</div>
              <ul className="list-disc pl-5">
                {ingestResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-red-600">
                    Row {e.row}: {e.msg}
                  </li>
                ))}
              </ul>
              {ingestResult.errors.length > 10 && (
                <div className="text-xs text-muted-foreground mt-1">…and more</div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const defaultInviteTemplateCsv =
  'full_name,email,role,unit_id,unit_number\n' +
  'Alex Smith,alex@example.com,tenant,,1203\n' +
  'Jamie Lee,jamie@example.com,owner,,PH-1\n';
