'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import dayjs from 'dayjs';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export default function OwnerResourceBooking({ resourceId }) {
    const supabase = useSupabaseClient();
    const session = useSession();

    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [slots, setSlots] = useState([]);
    const [filterTime, setFilterTime] = useState('00:00');

    const [loading, setLoading] = useState(false);
    const [bookLoadingKey, setBookLoadingKey] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch slots whenever date/resource/session changes
    useEffect(() => {
        if (resourceId && session?.user?.id) {
            fetchSlots();
        }
    }, [resourceId, selectedDate, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSlots = async () => {
        setLoading(true);
        setErrorMsg('');
        const { data, error } = await supabase.rpc('fn_get_available_slots', {
            p_resource: resourceId,
            p_date: selectedDate,
            p_user: session.user.id,
        });

        if (error) {
            console.error('Slots error:', error);
            setErrorMsg('Failed to load available slots.');
            setSlots([]);
            setLoading(false);
            return;
        }

        const mapped = (data || []).map((s) => ({
            start_at: s.start_at,
            end_at: s.end_at,
            seats_left: s.seats_left,
            time_label: dayjs(s.start_at).format('HH:mm'),
        }));

        setSlots(mapped);
        setLoading(false);
    };

    const visible = useMemo(
        () => slots.filter((s) => s.time_label >= filterTime),
        [slots, filterTime]
    );

    const handleBook = async (slot) => {
        setBookLoadingKey(slot.start_at);
        setErrorMsg('');

        try {
            const res = await fetch('/api/resources/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resource_id: resourceId,
                    start_at: slot.start_at,
                    end_at: slot.end_at,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Unable to book this slot.');
            }

            await fetchSlots();
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message || 'Unable to book this slot.');
        } finally {
            setBookLoadingKey('');
        }
    };

    const prevDay = () =>
        setSelectedDate((d) => dayjs(d).subtract(1, 'day').format('YYYY-MM-DD'));
    const nextDay = () =>
        setSelectedDate((d) => dayjs(d).add(1, 'day').format('YYYY-MM-DD'));
    const today = () => setSelectedDate(dayjs().format('YYYY-MM-DD'));

    return (
        <Card className="w-full">
            <CardHeader className="gap-2">
                <div className="flex items-center justify-between">
                    <div className="">
                        <CardTitle>Book this resource</CardTitle>
                        <CardDescription>Select a date and time to make a booking.</CardDescription>
                    </div>

                    <div className="flex items-center gap-2 ml-4 sm:ml-6">
                        <Button variant="outline" size="icon" onClick={prevDay} aria-label="Previous day">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextDay} aria-label="Next day">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" onClick={today}>Today</Button>
                        <Button variant="outline" onClick={fetchSlots} disabled={loading}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>


            <CardContent className="space-y-4">
                {errorMsg ? (
                    <Alert variant="destructive">
                        <AlertTitle>Problem</AlertTitle>
                        <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Date picker */}
                    <div className="grid gap-2">
                        <Label htmlFor="date">Select date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    {/* Time filter */}
                    <div className="grid gap-2">
                        <Label htmlFor="after">Show slots after</Label>
                        <div className="flex gap-2">
                            <Input
                                id="after"
                                type="time"
                                value={filterTime}
                                onChange={(e) => setFilterTime(e.target.value)}
                                className="w-full"
                            />
                            <Button variant="outline" onClick={() => setFilterTime('00:00')}>
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Slots */}
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                ) : visible.length ? (
                    <div className="space-y-2">
                        {visible.map((s) => {
                            const isFull = s.seats_left === 0;
                            const isBooking = bookLoadingKey === s.start_at;
                            return (
                                <div
                                    key={`${s.start_at}-${s.end_at}`}
                                    className="rounded-lg border p-3 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl border p-2">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">
                                                {dayjs(s.start_at).format('h:mm A')} – {dayjs(s.end_at).format('h:mm A')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Starts {dayjs(s.start_at).fromNow?.() || dayjs(s.start_at).format('HH:mm')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Badge variant={isFull ? 'destructive' : 'secondary'}>
                                            {isFull ? 'Full' : `${s.seats_left} left`}
                                        </Badge>
                                        <Button
                                            onClick={() => handleBook(s)}
                                            disabled={isFull || isBooking}
                                        >
                                            {isBooking ? 'Booking…' : 'Book'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">No slots available.</div>
                )}
            </CardContent>

            <CardFooter className="justify-end" />
        </Card>
    );
}
