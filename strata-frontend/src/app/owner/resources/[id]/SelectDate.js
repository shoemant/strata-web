'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export default function SelectDate({ resourceId, currentDate }) {
    const router = useRouter();
    const [selected, setSelected] = useState(new Date(currentDate));

    return (
        <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
                if (!d) return;
                setSelected(d);
                router.replace(
                    `/owner/resources/${resourceId}?date=${d.toISOString().slice(0, 10)}`
                );
            }}
        />
    );
}
