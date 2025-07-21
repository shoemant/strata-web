// src/app/manager/dashboard/page.jsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function ManagerDashboard() {
  const supabase = useSupabaseClient();
  const session = useSession();                // <- change here

  const [building, setBuilding] = useState(null);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [resources, setResources] = useState([]);

  // document preview folder+list
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [calDate, setCalDate] = useState(new Date());

  // 1) fetch building + data + folder list
  useEffect(() => {
    if (!session) return;

    async function load() {
      // a) manager’s building
      const { data: mb, error: mbErr } = await supabase
        .from('manager_buildings')
        .select('buildings!manager_buildings_building_id_fkey(name,id)')
        .eq('user_id', session.user.id)
        .single();
      if (mbErr || !mb) {
        setLoading(false);
        return;
      }
      const b = mb.buildings;
      setBuilding(b);

      // b) maintenance / announcements / resources
      const [pendRes, compRes, annRes, resRes] = await Promise.all([
        supabase.from('maintenance_requests').select('*').eq('building_id', b.id).eq('status', 'pending'),
        supabase.from('maintenance_requests').select('*').eq('building_id', b.id).eq('status', 'completed'),
        supabase.from('announcements').select('*').eq('building_id', b.id).order('created_at', { ascending: false }),
        supabase.from('resources').select('*').eq('building_id', b.id).order('name'),
      ]);
      setPending(pendRes.data || []);
      setCompleted(compRes.data || []);
      setAnnouncements(annRes.data || []);
      setResources(resRes.data || []);

      // c) distinct folder list
      const { data: folderData } = await supabase
        .from('documents')
        .select('folder', { distinct: true })
        .eq('building_id', b.id)
        .order('folder', { ascending: true });
      setFolders(folderData.map(f => f.folder || 'root'));

      setLoading(false);
    }

    load();
  }, [session, supabase]);

  // 2) fetch docs for preview whenever building or folder changes
  useEffect(() => {
    if (!building) return;
    (async () => {
      const { data } = await supabase
        .from('documents')
        .select('id,title,url')
        .eq('building_id', building.id)
        .eq('folder', folder === 'root' ? '' : folder)
        .order('created_at', { ascending: false });
      setDocs(data || []);
    })();
  }, [building, folder, supabase]);

  const confirmRequest = async (id) => {
    const updated_at = new Date().toISOString();
    await supabase
      .from('maintenance_requests')
      .update({ status: 'completed', updated_at })
      .eq('id', id);
    setPending(p => p.filter(r => r.id !== id));
    // optionally add to completed…
  };

  if (!session) return <p className="p-6">Loading session…</p>;
  if (loading) return <p className="p-6">Loading data…</p>;

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-12">
        {/* HEADER */}
        <Card className="bg-primary">
          <CardHeader>
            <CardTitle className="text-center text-4xl text-primary-foreground font-bold font- uppercase">
              {building.name}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* TOP ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements */}
          <Card>
            <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {announcements.length > 0
                ? announcements.map(a => (
                  <Alert key={a.id}>
                    <AlertTitle>{a.title}</AlertTitle>
                    <AlertDescription>
                      {a.message}
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleTimeString()}
                      </p>
                    </AlertDescription>
                  </Alert>
                ))
                : <p className="text-center text-sm text-muted-foreground">No announcements.</p>
              }
            </CardContent>
          </Card>
          {/* Documents Preview */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Documents</CardTitle>
              </div>
              <select
                value={folder || 'root'}
                onChange={e => setFolder(e.target.value)}
                className="mt-2 w-1/2 border rounded px-2 py-1 text-sm"
              >
                <option value="root">root</option>
                {folders.map(f => (
                  f !== 'root' && <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 space-y-2">
                {docs.length > 0
                  ? docs.slice(0, 5).map(doc => (
                    <div key={doc.id} className="truncate">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                      >
                        {doc.title}
                      </a>
                    </div>
                  ))
                  : <p className="text-sm text-muted-foreground">No documents.</p>
                }
                {docs.length > 5 && (
                  <p className="text-xs text-center text-primary">
                    …and {docs.length - 5} more
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Maintenance Updates */}

        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule */}
          <Card>
            <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={calDate}
                onSelect={setCalDate}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Maintenance Updates</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                  <ScrollArea className="h-64">
                    {pending.length > 0
                      ? pending.map(r => (
                        <Card key={r.id} className="mb-4 border-l-4 border-destructive">
                          <CardContent className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Badge variant="destructive">Pending</Badge>
                              <p className="text-xs text-muted-foreground">
                                {new Date(r.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                            <h3 className="text-lg font-medium">{r.title}</h3>
                            <p className="text-sm">{r.description}</p>
                            <Button size="sm" onClick={() => confirmRequest(r.id)}>
                              Confirm
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                      : <p className="text-center text-sm text-muted-foreground">No pending.</p>
                    }
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="completed">
                  <ScrollArea className="h-64">
                    {completed.length > 0
                      ? completed.map(r => (
                        <Card key={r.id} className="mb-4 border-l-4 border-primary">
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <Badge variant="outline">Completed</Badge>
                              <p className="text-xs text-muted-foreground">
                                {new Date(r.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <h3 className="text-lg font-medium">{r.title}</h3>
                            <p className="text-sm">{r.description}</p>
                          </CardContent>
                        </Card>
                      ))
                      : <p className="text-center text-sm text-muted-foreground">No completed.</p>
                    }
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {resources.length > 0
                ? resources.map(r => (
                  <Card key={r.id} className="bg-primary/5">
                    <CardContent className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{r.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {r.available_start} – {r.available_end} ({r.booking_interval_minutes} min)
                        </p>
                        <p className="text-sm">{r.location_description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
                : <p className="text-center text-sm text-muted-foreground">No resources.</p>
              }
            </CardContent>
          </Card>
        </div>
      </div>

    </ProtectedRoute >
  );
}
