'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, FileDown, UploadCloud } from 'lucide-react';
import { sendInviteEmail } from '@/app/login/lib/authActions';

export default function BulkCsvUploader({
  supabase,
  buildingId,
  buildingLabel,
  onSuccess,
  onError,
  templateCsv = defaultInviteTemplateCsv,
}) {
  const csvRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });
  const [ingestResult, setIngestResult] = useState(null);

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => {
      const parts = [];
      let curr = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
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

  async function resolveUnitId(buildingId, unit_id, unit_number) {
    if (unit_id) return unit_id;

    const key = (unit_number ?? '').trim();
    if (!key) return null;

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

  function isValidEmail(v) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
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

      const need = ['email', 'role'];
      const hasAll = need.every((h) => headers.includes(h));
      if (!hasAll) {
        const msg = `CSV must include headers: ${need.join(', ')}`;
        setStatus({ ok: false, msg });
        onError?.(msg);
        return;
      }

      const prepared = [];
      const localErrors = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 2;

        const email = (r.email || '').trim().toLowerCase();
        const role = (r.role || '').trim().toLowerCase();
        const note = (r.note || '').trim() || null;

        const unit_id_raw = (r.unit_id || '').trim();
        const unit_number = (r.unit_number || r.label || '').trim();

        if (!email || !isValidEmail(email)) {
          localErrors.push({ row: rowNum, msg: 'Invalid or missing email' });
          continue;
        }

        if (!['manager', 'owner', 'tenant'].includes(role)) {
          localErrors.push({
            row: rowNum,
            msg: `Unsupported role: ${role || '(blank)'}`,
          });
          continue;
        }

        let unit_id = null;
        if (role === 'owner' || role === 'tenant') {
          unit_id = await resolveUnitId(buildingId, unit_id_raw, unit_number);
          if (!unit_id) {
            localErrors.push({
              row: rowNum,
              msg: 'Could not resolve unit for owner/tenant',
            });
            continue;
          }
        }

        prepared.push({ email, role, unit_id, note, _rowNum: rowNum });
      }

      if (!prepared.length) {
        const msg = 'No valid rows to import.';
        setStatus({ ok: false, msg });
        onError?.(msg);
        setIngestResult({
          processed: rows.length,
          created: 0,
          skipped: rows.length,
          errors: localErrors,
        });
        return;
      }

      const { data: bulkRes, error: bulkErr } = await supabase.rpc(
        'create_invites_bulk',
        {
          p_building_id: buildingId,
          p_rows: prepared.map((r) => ({
            email: r.email,
            role: r.role,
            unit_id: r.unit_id,
            note: r.note,
          })),
        }
      );

      if (bulkErr) {
        const msg = bulkErr.message || 'Bulk invite RPC failed.';
        setStatus({ ok: false, msg });
        onError?.(msg);
        return;
      }

      let emailed = 0;
      const rpcErrors = [];

      const unitsById = {};
      const { data: unitRows } = await supabase
        .from('units')
        .select('id,label')
        .eq('building_id', buildingId);
      (unitRows || []).forEach((u) => (unitsById[u.id] = u.label));

      for (let idx = 0; idx < (bulkRes || []).length; idx++) {
        const r = bulkRes[idx];
        const originalRowNum = prepared[idx]?._rowNum ?? null;

        if (!r.ok) {
          rpcErrors.push({
            row: originalRowNum ?? idx + 2,
            msg: r.message || 'RPC failed',
          });
          continue;
        }

        if (!r.token) {
          rpcErrors.push({
            row: originalRowNum ?? idx + 2,
            msg: 'Invite created but token missing in response',
          });
          continue;
        }

        const unitLabel = r.unit_id ? (unitsById[r.unit_id] ?? null) : null;

        try {
          await sendInviteEmail({
            email: r.email_norm || prepared[idx]?.email,
            role: r.role,
            building_label: buildingLabel || buildingId,
            unit_label: unitLabel,
            token: r.token,
            expires_at: r.expires_at,
          });

          emailed++;
        } catch (err) {
          rpcErrors.push({
            row: originalRowNum ?? idx + 2,
            msg: err.message || 'Email send failed',
          });
        }
      }

      const processed = rows.length;
      const created = (bulkRes || []).filter((x) => x.ok).length;

      const summary = {
        buildingId,
        processed,
        created,
        emailed,
        errors: [...localErrors, ...rpcErrors],
      };

      setIngestResult(summary);

      const okMsg = `Rows: ${processed}, invites created: ${created}, emails sent: ${emailed}`;
      setStatus({ ok: true, msg: okMsg });
      onSuccess?.(summary, okMsg);
    } catch (err) {
      const msg = err.message || 'Bulk invite failed.';
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
        <Button
          onClick={downloadTemplate}
          variant="outline"
          size="sm"
          className="inline-flex items-center"
        >
          <FileDown className="mr-2 h-4 w-4" />
          Template CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Upload a CSV to create{' '}
        <span className="font-medium">pending invitations</span> and email each
        invitee.
      </p>

      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" type="file" ref={csvRef} accept=".csv,text/csv" />
        <p className="text-xs text-muted-foreground">
          Headers: <code>email,role,unit_id,unit_number,note</code>
          &nbsp;|&nbsp; Roles: <code>manager</code>, <code>owner</code>,{' '}
          <code>tenant</code>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleCsvUpload}
          disabled={!buildingId || uploading}
          className="inline-flex items-center"
        >
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
            <li>
              <span className="text-muted-foreground">Building:</span>{' '}
              {ingestResult.buildingId}
            </li>
            <li>
              <span className="text-muted-foreground">Processed:</span>{' '}
              {ingestResult.processed}
            </li>
            <li>
              <span className="text-muted-foreground">Invites created:</span>{' '}
              {ingestResult.created}
            </li>
            <li>
              <span className="text-muted-foreground">Emails sent:</span>{' '}
              {ingestResult.emailed}
            </li>
          </ul>

          {ingestResult?.errors?.length ? (
            <div className="mt-2">
              <div className="font-medium">
                Errors ({ingestResult.errors.length}):
              </div>
              <ul className="list-disc pl-5">
                {ingestResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-red-600">
                    Row {e.row}: {e.msg}
                  </li>
                ))}
              </ul>
              {ingestResult.errors.length > 10 && (
                <div className="text-xs text-muted-foreground mt-1">
                  …and more
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const defaultInviteTemplateCsv =
  'email,role,unit_id,unit_number,note\n' +
  'alex@example.com,tenant,,1203,Welcome!\n' +
  'jamie@example.com,owner,,PH-1,\n' +
  'newmanager@example.com,manager,,,\n';
