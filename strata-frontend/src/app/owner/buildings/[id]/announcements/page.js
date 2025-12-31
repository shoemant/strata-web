'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';

export default function OwnerAnnouncementsPage() {
  const params = useParams();
  const buildingId = params?.id;
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  async function fetchAnnouncements() {
    if (!buildingId) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('building_id', buildingId)
      .in('target_audience', ['all', 'owners'])
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Owner announcements fetch error:', error);
      setError('Could not load announcements.');
      setAnnouncements([]);
    } else {
      setAnnouncements(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  const prettyEventDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : null;

  return (
    <div className="absolute top-16 bottom-0 left-16 right-0 bg-background p-6 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnnouncements}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No announcements right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {a.target_audience || 'all'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {a.event_date && (
                  <div className="text-xs text-muted-foreground">
                    Event: <b>{prettyEventDate(a.event_date)}</b>
                  </div>
                )}

                {a.subtitle && <div className="text-sm">{a.subtitle}</div>}

                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {a.message}
                </p>

                <div className="text-xs text-muted-foreground">
                  Posted: {new Date(a.created_at).toLocaleString()}
                  {a.expires_at && (
                    <>
                      {' '}
                      · Expires: {new Date(a.expires_at).toLocaleDateString()}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
