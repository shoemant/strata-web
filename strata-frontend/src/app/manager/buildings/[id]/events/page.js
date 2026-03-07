'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useSessionContext,
  useSupabaseClient,
} from '@supabase/auth-helpers-react';

import ProtectedRoute from '@/components/ProtectedRoute';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Plus } from 'lucide-react';

export default function ManagerEventsPage() {
  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const params = useParams();
  const buildingId = params?.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState([]);
  const [building, setBuilding] = useState(null);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    start_at: '',
    end_at: '',
  });

  const userId = session?.user?.id;

  async function loadPageData() {
    if (!buildingId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const [
        { data: buildingData, error: buildingError },
        { data: eventData, error: eventError },
      ] = await Promise.all([
        supabase
          .from('buildings')
          .select('id, name')
          .eq('id', buildingId)
          .single(),
        supabase
          .from('events')
          .select('*')
          .eq('building_id', buildingId)
          .order('start_at', { ascending: true }),
      ]);

      if (buildingError) throw buildingError;
      if (eventError) throw eventError;

      setBuilding(buildingData || null);
      setEvents(eventData || []);
    } catch (err) {
      console.error('Failed to load events page:', err);
      setErrorMsg(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!buildingId) return;
    loadPageData();
  }, [buildingId]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => new Date(e.start_at) >= now);
  }, [events]);

  const pastEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.start_at) < now)
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  }, [events]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      location: '',
      start_at: '',
      end_at: '',
    });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.start_at) {
      setErrorMsg('Title and start time are required.');
      return;
    }

    if (form.end_at && new Date(form.end_at) < new Date(form.start_at)) {
      setErrorMsg('End time cannot be before start time.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        building_id: buildingId,
        created_by: userId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        start_at: form.start_at,
        end_at: form.end_at || null,
      };

      const { error } = await supabase.from('events').insert(payload);

      if (error) throw error;

      resetForm();
      setOpen(false);
      await loadPageData();
    } catch (err) {
      console.error('Create event error:', err);
      setErrorMsg(err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this event?'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      await loadPageData();
    } catch (err) {
      console.error('Delete event error:', err);
      setErrorMsg(err.message || 'Failed to delete event.');
    }
  };

  const formatDateTime = (date) =>
    new Date(date).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        Not signed in.
      </div>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['manager']}>
        <div className="p-6">Loading events...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 overflow-auto">
        <div className="w-full px-6 pt-0 pb-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-muted-foreground mt-1">
                Manage building events separately from announcements
                {building?.name ? ` for ${building.name}` : ''}.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Community BBQ"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Add event details"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Lobby lounge"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start_at">Start</Label>
                      <Input
                        id="start_at"
                        type="datetime-local"
                        value={form.start_at}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            start_at: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_at">End</Label>
                      <Input
                        id="end_at"
                        type="datetime-local"
                        value={form.end_at}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            end_at: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {errorMsg ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {errorMsg}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Event'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {errorMsg && !open ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No upcoming events yet.
                  </div>
                ) : (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-border/50 bg-card/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            <h3 className="font-medium text-foreground">
                              {event.title}
                            </h3>
                            <Badge variant="outline">Upcoming</Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(event.start_at)}
                            {event.end_at
                              ? ` to ${formatDateTime(event.end_at)}`
                              : ''}
                          </p>

                          {event.location ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          ) : null}

                          {event.description ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {event.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Past Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pastEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No past events yet.
                  </div>
                ) : (
                  pastEvents.slice(0, 8).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border/40 p-3"
                    >
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(event.start_at)}
                      </div>
                      {event.location ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.location}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
