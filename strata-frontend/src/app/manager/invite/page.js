'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw } from 'lucide-react';

export default function AnnouncementsPage() {
  const params = useParams();
  const buildingId = params?.id;
  const supabase = useSupabaseClient();

  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', target_audience: 'all' });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (buildingId) fetchAnnouncements();
  }, [buildingId]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;

    setPosting(true);
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user?.id) {
      console.error('User not authenticated');
      setPosting(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      target_audience: form.target_audience,
      building_id: buildingId,
      created_by: userData.user.id,
    };

    const { error } = await supabase.from('announcements').insert([payload]);

    if (error) {
      console.error('Insert error:', error);
    } else {
      setForm({ title: '', message: '', target_audience: 'all' });
      fetchAnnouncements();
    }
    setPosting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <Button variant="outline" size="sm" onClick={fetchAnnouncements} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create new announcement</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Maintenance update, policy change, etc."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write the announcement details..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
                className="min-h-[120px]"
              />
            </div>

            {/* 👇 Copied pattern from your working component */}
            <div className="grid gap-2">
              <Label htmlFor="audience">Target audience</Label>
              <Select
                value={form.target_audience}
                onValueChange={(v) => setForm((f) => ({ ...f, target_audience: v }))}
              >
                <SelectTrigger id="audience" className="w-full">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="owners">Owners</SelectItem>
                  <SelectItem value="tenants">Tenants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" disabled={posting}>
              {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {posting ? 'Posting…' : 'Post Announcement'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Separator />

      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No announcements yet.
            </CardContent>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {a.target_audience || 'all'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm leading-relaxed">{a.message}</p>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
