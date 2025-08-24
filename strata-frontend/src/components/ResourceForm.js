'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import WeeklyAvailabilityEditor from './WeeklyAvailabilityEditor';

const AMENITIES_BUCKET = 'amenities';

function sanitizePathName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default function ResourceForm({ initial = {}, onSave, buildingId }) {
    const supabase = useSupabaseClient();

    const [values, setValues] = useState({
        name: '',
        type_id: '',
        location_description: '',
        total_spots: 1,
        available_start: '08:00',
        available_end: '22:00',
        booking_interval_minutes: 60,
        max_slots_per_user_per_day: 2,
        is_active: true,
        image_path: null,
        ...initial,
    });

    const [types, setTypes] = useState([]);
    const [addingType, setAddingType] = useState(false);
    const [newType, setNewType] = useState({
        name: '',
        description: '',
        max_slots_per_user_per_day: 2,
    });

    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Weekly availability dialog state
    const [differentHours, setDifferentHours] = useState(false);
    const [showWeeklyDialog, setShowWeeklyDialog] = useState(false);
    const [weeklyRows, setWeeklyRows] = useState(null); // [{weekday,start_time,end_time}...]

    // Image preview
    useEffect(() => {
        if (!values.image_path) return setPreviewUrl(null);
        const { data } = supabase.storage
            .from(AMENITIES_BUCKET)
            .getPublicUrl(values.image_path);
        setPreviewUrl(data?.publicUrl || null);
    }, [values.image_path, supabase]);

    // Fetch types
    useEffect(() => {
        if (!buildingId) return;
        (async () => {
            const { data, error } = await supabase
                .from('resource_types')
                .select('id,name,building_id')
                .or(`building_id.eq.${buildingId},building_id.is.null`)
                .order('id');
            if (error) console.error(error);
            setTypes(data || []);
        })();
    }, [buildingId, supabase]);

    // Handle “Different hours…” checkbox
    const toggleDifferentHours = (checked) => {
        setDifferentHours(checked);
        if (checked) {
            // Open the dialog. If user hasn’t edited before, start with defaults.
            setShowWeeklyDialog(true);
            if (!weeklyRows) {
                const defaults = Array.from({ length: 7 }).map((_, i) => ({
                    weekday: i,
                    start_time: values.available_start,
                    end_time: values.available_end,
                }));
                setWeeklyRows(defaults);
            }
        } else {
            // Clear custom rows when turning off, so we fall back to Opens/Closes
            setWeeklyRows(null);
        }
    };

    // Submit: save resource + upsert weekly rows (if differentHours)
    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...values,
            total_spots: Number(values.total_spots),
            booking_interval_minutes: Number(values.booking_interval_minutes),
            max_slots_per_user_per_day: values.max_slots_per_user_per_day
                ? Number(values.max_slots_per_user_per_day)
                : null,
            is_active: Boolean(values.is_active),
        };

        const saved = await onSave(payload); // parent should return saved { id, ... }
        if (!saved?.id) return;

        // If the user chose different hours, persist them; otherwise default to Opens/Closes.
        const rowsToSave = differentHours
            ? weeklyRows
            : Array.from({ length: 7 }).map((_, i) => ({
                weekday: i,
                start_time: values.available_start,
                end_time: values.available_end,
            }));

        const upserts = rowsToSave.map((r) => ({
            resource_id: saved.id,
            weekday: r.weekday,
            start_time: r.start_time,
            end_time: r.end_time,
        }));

        const { error } = await supabase
            .from('resource_weekly_availability')
            .upsert(upserts, { onConflict: 'resource_id,weekday' });

        if (error) {
            console.error(error);
            alert('Saved resource, but failed saving weekly availability.');
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const filename = `${Date.now()}_${sanitizePathName(file.name)}`;
            const path = `${buildingId}/${filename}`;

            const { error: upErr } = await supabase.storage
                .from(AMENITIES_BUCKET)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: file.type || `image/${ext}`,
                });

            if (upErr) throw upErr;

            setValues((v) => ({ ...v, image_path: path }));
        } catch (err) {
            console.error(err);
            alert('Upload failed. Please try a different image.');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setValues((v) => ({ ...v, image_path: null }));
        setPreviewUrl(null);
    };

    const handleChange = (e) =>
        setValues({ ...values, [e.target.name]: e.target.value });

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* BASIC INFO */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Info</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Resource name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g., Gym"
                                value={values.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type_id">Type</Label>
                            <div className="flex gap-2">
                                <select
                                    id="type_id"
                                    name="type_id"
                                    value={values.type_id}
                                    onChange={handleChange}
                                    className="p-2 border rounded flex-1"
                                    required
                                >
                                    <option value="">Choose type…</option>
                                    {types.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                            {t.building_id ? '' : ' (global)'}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAddingType((s) => !s)}
                                    title="Add new type"
                                >
                                    +
                                </Button>
                            </div>
                        </div>

                        {addingType && (
                            <div className="md:col-span-2 p-4 border rounded-md space-y-3 bg-muted/30">
                                <h3 className="font-medium">New resource type</h3>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <div className="space-y-1 md:col-span-1">
                                        <Label>Type name</Label>
                                        <Input
                                            value={newType.name}
                                            onChange={(e) =>
                                                setNewType({ ...newType, name: e.target.value })
                                            }
                                            placeholder="e.g., Amenity"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-1">
                                        <Label>Daily slots / user</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={newType.max_slots_per_user_per_day}
                                            onChange={(e) =>
                                                setNewType({
                                                    ...newType,
                                                    max_slots_per_user_per_day: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-3">
                                        <Label>Description (optional)</Label>
                                        <Textarea
                                            value={newType.description}
                                            onChange={(e) =>
                                                setNewType({ ...newType, description: e.target.value })
                                            }
                                            placeholder="Short summary"
                                            className="min-h-[70px]"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            if (!newType.name.trim())
                                                return alert('Type name is required');
                                            const { data, error } = await supabase
                                                .from('resource_types')
                                                .insert([
                                                    {
                                                        ...newType,
                                                        max_slots_per_user_per_day: Number(
                                                            newType.max_slots_per_user_per_day
                                                        ),
                                                        building_id: buildingId,
                                                    },
                                                ])
                                                .select('id')
                                                .single();

                                            if (error) return alert(error.message);

                                            const { data: freshTypes } = await supabase
                                                .from('resource_types')
                                                .select('id,name,building_id')
                                                .or(
                                                    `building_id.eq.${buildingId},building_id.is.null`
                                                )
                                                .order('id');

                                            setTypes(freshTypes || []);
                                            setValues((v) => ({ ...v, type_id: data.id }));
                                            setNewType({
                                                name: '',
                                                description: '',
                                                max_slots_per_user_per_day: 2,
                                            });
                                            setAddingType(false);
                                        }}
                                    >
                                        Save type
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setAddingType(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* MEDIA (IMAGE) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Photo (optional)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {previewUrl ? (
                            <div className="flex items-start gap-4">
                                <div className="relative w-64 h-40 rounded-lg overflow-hidden bg-muted">
                                    <Image
                                        src={previewUrl}
                                        alt="Amenity preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            document.getElementById('amenity-file').click()
                                        }
                                    >
                                        Replace image
                                    </Button>
                                    <Button type="button" variant="destructive" onClick={removeImage}>
                                        Remove image
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Input
                                    id="amenity-file"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="max-w-xs"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('amenity-file').click()}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading…' : 'Upload image'}
                                </Button>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Stored as <code>{buildingId}/filename</code> in the <code>amenities</code> bucket.
                        </p>
                    </CardContent>
                </Card>

                {/* CAPACITY & LIMITS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Capacity & Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Total spots</Label>
                            <Input
                                type="number"
                                name="total_spots"
                                min="1"
                                value={values.total_spots}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Slot length (minutes)</Label>
                            <Input
                                type="number"
                                name="booking_interval_minutes"
                                min="5"
                                step="5"
                                value={values.booking_interval_minutes}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Daily slots / user</Label>
                            <Input
                                type="number"
                                name="max_slots_per_user_per_day"
                                min="1"
                                value={values.max_slots_per_user_per_day ?? ''}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* OPERATING WINDOW + checkbox */}
                <Card>
                    <CardHeader>
                        <CardTitle>Operating Window</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Opens at</Label>
                                <Input
                                    type="time"
                                    name="available_start"
                                    value={values.available_start}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Closes at</Label>
                                <Input
                                    type="time"
                                    name="available_end"
                                    value={values.available_end}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="different-hours"
                                type="checkbox"
                                checked={differentHours}
                                onChange={(e) => toggleDifferentHours(e.target.checked)}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="different-hours">
                                Different hours on certain days
                            </Label>
                            {differentHours && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowWeeklyDialog(true)}
                                    className="ml-2"
                                >
                                    Edit weekly hours
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* DETAILS & SAVE */}
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="location_description">Location / notes</Label>
                            <Textarea
                                id="location_description"
                                name="location_description"
                                placeholder="e.g., Basement level, near elevator"
                                value={values.location_description}
                                onChange={handleChange}
                                className="min-h-[80px]"
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center gap-3">
                            <Switch
                                id="is_active"
                                checked={!!values.is_active}
                                onCheckedChange={(checked) =>
                                    setValues((v) => ({ ...v, is_active: checked }))
                                }
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>

                        <div className="pt-2">
                            <Button type="submit">Save resource</Button>
                        </div>
                    </CardContent>
                </Card>
            </form>

            {/* WEEKLY DIALOG */}
            <Dialog open={showWeeklyDialog} onOpenChange={setShowWeeklyDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Customize weekly hours</DialogTitle>
                    </DialogHeader>

                    <WeeklyAvailabilityEditor
                        opensAt={values.available_start}
                        closesAt={values.available_end}
                        initial={weeklyRows}
                        onChange={setWeeklyRows}
                    />

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWeeklyDialog(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
