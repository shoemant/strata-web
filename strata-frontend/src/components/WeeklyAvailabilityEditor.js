'use client';

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeeklyAvailabilityEditor({
    opensAt = '08:00',
    closesAt = '22:00',
    initial = null,             // [{weekday,start_time,end_time}, ...] or null
    onChange,                   // (rows) => void
}) {
    const defaultRows = useMemo(
        () => Array.from({ length: 7 }).map((_, i) => ({
            weekday: i,
            start_time: opensAt,
            end_time: closesAt,
        })),
        [opensAt, closesAt]
    );

    const [rows, setRows] = useState(initial?.length === 7 ? initial : defaultRows);

    // If parent changes defaults and user hasn't customized, you can choose
    // to auto-sync by uncommenting the effect below. Right now we keep whatever
    // the user set inside the dialog until they click "Sync with Opens/Closes".
    useEffect(() => { setRows(defaultRows); }, [defaultRows]);

    useEffect(() => { onChange?.(rows); }, [rows, onChange]);

    const updateRow = (idx, field, value) => {
        setRows((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">Weekly availability</h3>
            </div>

            <div className="space-y-3">
                {rows.map((r, idx) => (
                    <div key={r.weekday} className="grid grid-cols-12 items-center gap-3 rounded-md border p-3">
                        <div className="col-span-3 sm:col-span-2 font-medium">{DAY_LABELS[r.weekday]}</div>

                        <div className="col-span-4 sm:col-span-5">
                            <Label className="text-xs">Start</Label>
                            <Input
                                type="time"
                                value={r.start_time}
                                onChange={(e) => updateRow(idx, 'start_time', e.target.value)}
                            />
                        </div>

                        <div className="col-span-4 sm:col-span-5">
                            <Label className="text-xs">End</Label>
                            <Input
                                type="time"
                                value={r.end_time}
                                onChange={(e) => updateRow(idx, 'end_time', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
