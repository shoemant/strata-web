'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, FileDown, UploadCloud } from 'lucide-react';

/**
 * Props:
 * - supabase
 * - buildingId
 * - bucket?: string (default 'user_imports')
 * - templateCsv?: string
 * - onSuccess?: (result, msg?: string) => void  // e.g., refresh lists
 * - onError?: (msg?: string) => void
 */
export default function BulkCsvUploader({
  supabase,
  buildingId,
  bucket = 'user_imports',
  templateCsv = defaultTemplateCsv,
  onSuccess,
  onError,
}) {
  const csvRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });
  const [lastUploadedKey, setLastUploadedKey] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);

  const pad2 = (n) => n.toString().padStart(2, '0');
  const tsStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(
      d.getHours()
    )}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  };

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
      const key = `${buildingId}/${tsStamp()}_${file.name.replace(/\s+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(key, file, { upsert: false, contentType: 'text/csv' });

      if (upErr) {
        console.error('Upload error:', upErr);
        const msg = 'Upload failed.';
        setStatus({ ok: false, msg });
        onError?.(msg);
        return;
      }

      setLastUploadedKey(key);
      setStatus({ ok: true, msg: 'CSV uploaded to private storage.' });
      if (csvRef.current) csvRef.current.value = '';

      const { data, error } = await supabase.functions.invoke('ingest-user-csv', {
        body: { path: key, create_auth_if_missing: true },
      });

      if (error) {
        console.error('Ingest error:', error);
        const msg = 'Ingestion failed.';
        setStatus({ ok: false, msg });
        onError?.(msg);
      } else {
        setIngestResult(data);
        const msg = 'Ingestion completed.';
        setStatus({ ok: true, msg });
        onSuccess?.(data, msg);
      }
    } finally {
      setUploading(false);
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
        Upload a CSV of users. Saved privately to{' '}
        <code className="bg-muted px-1 py-0.5 rounded">/{bucket}/&lt;buildingId&gt;/</code> and parsed immediately.
      </p>

      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" type="file" ref={csvRef} accept=".csv,text/csv" />
        <p className="text-xs text-muted-foreground">
          Headers: <code>full_name,email,role,unit_id,unit_number</code>
          &nbsp;|&nbsp; Roles: <code>manager</code>, <code>owner</code>, <code>tenant</code>, <code>admin</code>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleCsvUpload} disabled={!buildingId || uploading} className="inline-flex items-center">
          <UploadCloud className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload & Ingest'}
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

      {lastUploadedKey && (
        <div className="mt-2 text-xs text-muted-foreground">
          Saved as: <code className="bg-muted px-1 py-0.5 rounded">{lastUploadedKey}</code>
        </div>
      )}

      {ingestResult && (
        <div className="mt-4 rounded-md border p-3 text-sm">
          <div className="font-medium mb-2">Ingestion summary</div>
          <ul className="space-y-1">
            <li>
              <span className="text-muted-foreground">Building:</span> {ingestResult.buildingId}
            </li>
            <li>
              <span className="text-muted-foreground">Processed:</span> {ingestResult.processed}
            </li>
            {typeof ingestResult.createdAuth === 'number' && (
              <li>
                <span className="text-muted-foreground">Auth users created:</span> {ingestResult.createdAuth}
              </li>
            )}
            {typeof ingestResult.inserted === 'number' && (
              <li>
                <span className="text-muted-foreground">Profiles inserted:</span> {ingestResult.inserted}
              </li>
            )}
            {typeof ingestResult.updated === 'number' && (
              <li>
                <span className="text-muted-foreground">Profiles updated:</span> {ingestResult.updated}
              </li>
            )}
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

const defaultTemplateCsv =
  'full_name,email,role,unit_id,unit_number\n' +
  'Alex Smith,alex@example.com,tenant,,1203\n' +
  'Jamie Lee,jamie@example.com,owner,,\n';
