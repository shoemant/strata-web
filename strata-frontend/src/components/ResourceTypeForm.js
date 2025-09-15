'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ResourceTypeForm({ initial = {}, onSave }) {
    const [values, setValues] = useState({
        name: '',
        description: '',
        max_slots_per_user_per_day: 2,
        ...initial,
    });

    const handleChange = (e) =>
        setValues({ ...values, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...values,
            max_slots_per_user_per_day: Number(values.max_slots_per_user_per_day),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Resource Type</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Type name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g., Amenity"
                            value={values.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Short summary of this type"
                            value={values.description}
                            onChange={handleChange}
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="max_slots_per_user_per_day">
                            Daily slots / user (default)
                        </Label>
                        <Input
                            id="max_slots_per_user_per_day"
                            type="number"
                            name="max_slots_per_user_per_day"
                            min="1"
                            value={values.max_slots_per_user_per_day}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit">Save</Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
