'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, CheckCircle2, AlertCircle, FileDown } from 'lucide-react';

const BUCKET = 'user_imports';
const TEMPLATE_CSV =
  'full_name,email,role,unit_id,unit_number\n' +
  'Alex Smith,alex@example.com,tenant,,1203\n' +
  'Jamie Lee,jamie@example.com,owner,,\n';

export default function ManagerCsvUploadPage() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const fileRef = useRef(null);
  const [buildingId, setBuildingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });
  const [lastUploadedKey, setLastUploadedKey] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);

  // Resolve manager's building_id
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('manager_buildings')
        .select('building_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching building_id:', error);
        setStatus({ ok: false, msg: 'Unable to resolve building for this manager.' });
      } else if (data?.building_id) {
        setBuildingId(data.building_id);
      } else {
        setStatus({ ok: false, msg: 'No building is assigned to this manager.' });
      }
    })();
  }, [session, supabase]);

  const formatTimestamp = () => {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setStatus({ ok: null, msg: '' });
    setIngestResult(null);

    if (!buildingId) {
      setStatus({ ok: false, msg: 'Building not resolved yet.' });
      return;
    }
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ ok: false, msg: 'Please choose a CSV file.' });
      return;
    }

    // Validate CSV
    const isCsvMime =
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.toLowerCase().endsWith('.csv');
    if (!isCsvMime) {
      setStatus({ ok: false, msg: 'Selected file is not a CSV.' });
      return;
    }

    setUploading(true);
    try {
      const ts = formatTimestamp();
      const safeName = file.name.replace(/\s+/g, '_');
      const key = `${buildingId}/${ts}_${safeName}`;

      // 1) upload to private storage
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(key, file, { upsert: false, contentType: 'text/csv' });

      if (upErr) {
        console.error('Upload error:', upErr);
        setStatus({ ok: false, msg: 'Upload failed.' });
        return;
      }

      setLastUploadedKey(key);
      setStatus({ ok: true, msg: 'CSV uploaded to private storage.' });
      if (fileRef.current) fileRef.current.value = '';

      // 2) invoke Edge Function to ingest
      const { data, error } = await supabase.functions.invoke('ingest-user-csv', {
        body: { path: key, create_auth_if_missing: true },
      });

      if (error) {
        console.error('Ingest error:', error);
        setStatus({ ok: false, msg: 'Ingestion failed.' });
      } else {
        setIngestResult(data);
        setStatus({ ok: true, msg: 'Ingestion completed.' });
      }
    } finally {
      setUploading(false);
    }
  };

  if (!session) return <p className="p-6">Loading…</p>;

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6">
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Bulk User CSV Upload</h1>
            <Link href="/manager/dashboard">
              <Button variant="ghost" size="sm">Back to Dashboard</Button>
            </Link>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Upload CSV (Private)</CardTitle>
              <Button onClick={downloadTemplate} variant="outline" size="sm" className="inline-flex items-center">
                <FileDown className="mr-2 h-4 w-4" />
                Template CSV
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a <span className="font-medium">CSV</span> of users. It is saved to a private bucket
                (<code className="bg-muted px-1 py-0.5 rounded">/{BUCKET}/&lt;buildingId&gt;/</code>) and parsed immediately.
              </p>

              <div className="space-y-2">
                <Label htmlFor="csv">CSV file</Label>
                <Input id="csv" type="file" ref={fileRef} accept=".csv,text/csv" />
                <p className="text-xs text-muted-foreground">
                  Headers: <code>full_name,email,role,unit_id,unit_number</code>&nbsp;&nbsp;|&nbsp;&nbsp;
                  Roles: <code>manager</code>, <code>owner</code>, <code>tenant</code>, <code>admin</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleUpload} disabled={!buildingId || uploading} className="inline-flex items-center">
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
                    <li><span className="text-muted-foreground">Building:</span> {ingestResult.buildingId}</li>
                    <li><span className="text-muted-foreground">Processed:</span> {ingestResult.processed}</li>
                    {typeof ingestResult.createdAuth === 'number' && (
                      <li><span className="text-muted-foreground">Auth users created:</span> {ingestResult.createdAuth}</li>
                    )}
                    {typeof ingestResult.inserted === 'number' && (
                      <li><span className="text-muted-foreground">Profiles inserted:</span> {ingestResult.inserted}</li>
                    )}
                    {typeof ingestResult.updated === 'number' && (
                      <li><span className="text-muted-foreground">Profiles updated:</span> {ingestResult.updated}</li>
                    )}
                  </ul>
                  {ingestResult.errors?.length ? (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
