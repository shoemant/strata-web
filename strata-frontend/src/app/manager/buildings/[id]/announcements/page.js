'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Trash2,
  Image as ImageIcon,
  X,
  Pencil,
  CalendarClock,
} from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function toDateInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDateTimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AnnouncementsPage() {
  const params = useParams();
  const buildingId = params?.id;
  const supabase = useSupabaseClient();

  const [banner, setBanner] = useState(null);
  const bannerTimerRef = useRef(null);

  const [announcements, setAnnouncements] = useState([]);

  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    message: '',
    target_audience: 'all',
    event_date: '',
    expiry_mode: 'none',
    expiry_days: '14',
    expires_at: '',
    publish_mode: 'now', // now | later
    publish_at: '',
    use_image: true,
    image_file: null,
    image_url: '',
    text_color: '#ffffff',
    banner_bg_color: '#1d4ed8',
    overlay_color: '#000000',
    overlay_opacity: 45,
  });

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const imageInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;

      if (userId) {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', userId)
          .maybeSingle();

        setIsAdmin(Boolean(prof?.is_admin));
      }

      const { data: pr } = await supabase
        .from('announcement_presets')
        .select('*')
        .eq('is_active', true)
        .order('title', { ascending: true });

      setPresets(pr || []);
    })();
  }, [supabase]);

  useEffect(() => {
    if (buildingId) fetchAnnouncements();
  }, [buildingId]);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  function resetForm() {
    if (imageInputRef.current) imageInputRef.current.value = '';

    setEditingId(null);
    setSelectedPresetId(null);

    setForm({
      title: '',
      subtitle: '',
      message: '',
      target_audience: 'all',
      event_date: '',
      expiry_mode: 'none',
      expiry_days: '14',
      expires_at: '',
      publish_mode: 'now',
      publish_at: '',
      use_image: true,
      image_file: null,
      image_url: '',
      text_color: '#ffffff',
      banner_bg_color: '#1d4ed8',
      overlay_color: '#000000',
      overlay_opacity: 45,
    });
  }

  async function fetchAnnouncements() {
    setLoading(true);

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('building_id', buildingId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('publish_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } else {
      setAnnouncements(data || []);
    }

    setLoading(false);
  }

  function presetImagePublicUrl(preset) {
    if (!preset?.image_path) return '';
    const { data } = supabase.storage
      .from('announcement-presets')
      .getPublicUrl(preset.image_path);

    return data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : '';
  }

  function applyPreset(preset) {
    if (!preset) return;

    setForm((f) => ({
      ...f,
      title: preset.title || '',
      subtitle: preset.subtitle || '',
      message: preset.message || '',
      target_audience: preset.target_audience || 'all',
      text_color: preset.text_color || f.text_color,
      banner_bg_color: preset.banner_bg_color || f.banner_bg_color,
      overlay_color: preset.overlay_color ?? f.overlay_color,
      overlay_opacity:
        typeof preset.overlay_opacity === 'number'
          ? preset.overlay_opacity
          : f.overlay_opacity,
      use_image: true,
      image_file: null,
      image_url: presetImagePublicUrl(preset),
    }));
  }

  const prettyEventDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, image_file: file }));
  };

  const clearSelectedImage = () => {
    if (imageInputRef.current) imageInputRef.current.value = '';
    setForm((f) => ({ ...f, image_file: null }));
  };

  async function uploadImageIfAny() {
    if (!form.use_image || !form.image_file) return form.image_url || null;

    const file = form.image_file;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${uid()}.${ext}`;
    const path = `buildings/${buildingId}/announcements/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (upErr) {
      console.error('Upload error:', upErr);
      return form.image_url || null;
    }

    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
    return pub?.publicUrl || null;
  }

  function beginEdit(a) {
    if (!a) return;

    if (imageInputRef.current) imageInputRef.current.value = '';

    let derivedExpiryMode = 'none';
    let derivedExpiryDays = '14';
    let derivedExpiresAt = '';

    if (a.expires_after_days) {
      derivedExpiryMode = 'duration';
      derivedExpiryDays = String(a.expires_after_days);
    } else if (a.expires_at) {
      derivedExpiryMode = 'exact';
      derivedExpiresAt = toDateInputValue(a.expires_at);
    }

    const publishMode =
      a.publish_at && new Date(a.publish_at) > new Date() ? 'later' : 'now';

    setEditingId(a.id);
    setForm({
      title: a.title || '',
      subtitle: a.subtitle || '',
      message: a.message || '',
      target_audience: a.target_audience || 'all',
      event_date: toDateInputValue(a.event_date),
      expiry_mode: derivedExpiryMode,
      expiry_days: derivedExpiryDays,
      expires_at: derivedExpiresAt,
      publish_mode: publishMode,
      publish_at: toDateTimeLocalValue(a.publish_at),
      use_image: Boolean(a.image_url),
      image_file: null,
      image_url: a.image_url || '',
      text_color: a.text_color || '#ffffff',
      banner_bg_color: a.banner_bg_color || '#1d4ed8',
      overlay_color: a.overlay_color || '#000000',
      overlay_opacity:
        typeof a.overlay_opacity === 'number' ? a.overlay_opacity : 45,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) return;

    setPosting(true);

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user?.id) {
      console.error('User not authenticated');
      setPosting(false);
      return;
    }

    const finalImageUrl = form.use_image ? await uploadImageIfAny() : null;

    const eventDateISO = form.event_date
      ? new Date(form.event_date).toISOString()
      : null;

    let expires_at = null;
    let expires_after_days = null;

    if (form.expiry_mode === 'next_day') {
      if (eventDateISO) {
        const d = new Date(eventDateISO);
        const explicit = new Date(d);
        explicit.setDate(d.getDate() + 1);
        explicit.setHours(0, 0, 0, 0);
        expires_at = explicit.toISOString();
      }
    } else if (form.expiry_mode === 'duration') {
      const n = parseInt(form.expiry_days, 10);
      if (!Number.isNaN(n) && n > 0) {
        expires_after_days = n;
        const base = eventDateISO ? new Date(eventDateISO) : new Date();
        const explicit = new Date(base);
        explicit.setDate(base.getDate() + n);
        explicit.setHours(0, 0, 0, 0);
        expires_at = explicit.toISOString();
      }
    } else if (form.expiry_mode === 'exact') {
      expires_at = form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null;
    }

    const publish_at =
      form.publish_mode === 'later' && form.publish_at
        ? new Date(form.publish_at).toISOString()
        : new Date().toISOString();

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      target_audience: form.target_audience,
      event_date: eventDateISO,
      expires_at,
      expires_after_days,
      publish_at,
      image_url: finalImageUrl,
      text_color: form.text_color || null,
      banner_bg_color: form.banner_bg_color || null,
      overlay_color: form.overlay_color || null,
      overlay_opacity: form.overlay_opacity,
    };

    if (!editingId) {
      payload.building_id = buildingId;
      payload.created_by = userData.user.id;
    }

    let result;

    if (editingId) {
      result = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', editingId)
        .eq('building_id', buildingId)
        .select('*')
        .maybeSingle();
    } else {
      result = await supabase
        .from('announcements')
        .insert([payload])
        .select('*')
        .maybeSingle();
    }

    console.log('save result:', result);
    const { data, error } = result;

    if (error) {
      console.error('Save error:', error);
      setBanner({
        type: 'error',
        msg: error.message || 'Failed to save announcement.',
      });
    } else if (!data) {
      console.warn(
        'No row was inserted/updated. Likely RLS or filter mismatch.'
      );
      setBanner({
        type: 'error',
        msg: 'No rows were updated. This is usually an RLS policy or row-match issue.',
      });
    } else {
      resetForm();
      await fetchAnnouncements();
      setBanner({
        type: 'success',
        msg: editingId
          ? 'Announcement updated successfully!'
          : 'Announcement saved successfully!',
      });
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    if (!confirm('Delete this announcement?')) return;

    setDeletingId(id);

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
      .eq('building_id', buildingId);

    if (error) {
      console.error('Delete error:', error);
    } else {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) resetForm();
    }

    setDeletingId(null);
  }

  const preview = {
    title: form.title || 'Announcement title',
    message: form.message || 'Write the announcement details...',
    dateLine: form.event_date
      ? new Date(form.event_date).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : '',
    imagePreviewUrl: form.image_file
      ? URL.createObjectURL(form.image_file)
      : form.image_url
        ? `${form.image_url}?v=${Date.now()}`
        : '',
    useImage: form.use_image,
    textColor: form.text_color || '#ffffff',
    bgColor: form.banner_bg_color || '#1d4ed8',
    overlayColor: form.overlay_color || '#000000',
    overlayOpacity: Math.max(
      0,
      Math.min(100, Number(form.overlay_opacity) || 0)
    ),
  };

  return (
    <div className="absolute left-0 md:left-16 right-0 top-16 bottom-0 bg-background p-6 space-y-12 overflow-auto">
      {banner && (
        <div
          className={[
            'fixed top-6 left-1/2 -translate-x-1/2 z-[9999]',
            'px-4 py-3 rounded-lg shadow-xl text-white',
            banner.type === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
            <span className="font-medium">{banner.msg}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Announcement Presets</CardTitle>
            <span className="text-xs text-muted-foreground">
              Pick a preset; then set dates if needed.
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1 grid gap-2">
              <Label htmlFor="preset">Preset</Label>
              <Select
                value={selectedPresetId || ''}
                onValueChange={(v) => setSelectedPresetId(v || null)}
              >
                <SelectTrigger id="preset" className="w-full">
                  <SelectValue
                    placeholder={
                      presets.length ? 'Choose a preset…' : 'No presets yet'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preset_event_date">Event date</Label>
              <Input
                id="preset_event_date"
                type="date"
                value={form.event_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_date: e.target.value }))
                }
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                disabled={!selectedPresetId}
                onClick={() => {
                  const preset = presets.find((p) => p.id === selectedPresetId);
                  applyPreset(preset);
                }}
              >
                Apply preset
              </Button>
            </div>
          </div>

          {selectedPresetId &&
            (() => {
              const p = presets.find((pp) => pp.id === selectedPresetId);
              const url = presetImagePublicUrl(p);

              return (
                <div className="grid gap-2">
                  <Label>Selected preset preview</Label>
                  <div
                    className="relative rounded-xl overflow-hidden border shadow"
                    style={{
                      height: '9rem',
                      background: url
                        ? `url(${url}) center/cover no-repeat`
                        : p?.banner_bg_color || '#1d4ed8',
                    }}
                  >
                    {url && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundColor: `${p?.overlay_color || '#000000'}${(
                            p?.overlay_opacity ?? 45
                          )
                            .toString(16)
                            .padStart(2, '0')}`,
                        }}
                      />
                    )}
                    <div className="relative h-full w-full px-4 md:px-6 flex items-center">
                      <div style={{ color: p?.text_color || '#fff' }}>
                        <div className="text-xs uppercase opacity-80">
                          Announcement
                        </div>
                        <div className="text-lg md:text-xl font-semibold leading-tight line-clamp-1">
                          {p?.title}
                        </div>
                        {p?.subtitle && (
                          <div className="text-sm opacity-90 line-clamp-1">
                            {p.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
        </CardContent>

        {isAdmin && (
          <PresetAdminPanel
            onCreated={async () => {
              const { data: pr } = await supabase
                .from('announcement_presets')
                .select('*')
                .eq('is_active', true)
                .order('title', { ascending: true });
              setPresets(pr || []);
            }}
          />
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>
              {editingId ? 'Edit announcement' : 'Create new announcement'}
            </CardTitle>

            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel editing
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Maintenance update, policy change, etc."
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write the announcement details..."
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                required
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="audience">Target audience</Label>
                <Select
                  value={form.target_audience}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, target_audience: v }))
                  }
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

              <div className="grid gap-2">
                <Label htmlFor="event_date">Event Date (optional)</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={form.event_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, event_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Publish</Label>
                <Select
                  value={form.publish_mode}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, publish_mode: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select publish timing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Post now</SelectItem>
                    <SelectItem value="later">Schedule for later</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.publish_mode === 'later' ? (
                <div className="grid gap-2">
                  <Label htmlFor="publish_at">Publish At</Label>
                  <Input
                    id="publish_at"
                    type="datetime-local"
                    value={form.publish_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publish_at: e.target.value }))
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="h-10 rounded-md border px-3 flex items-center text-sm text-muted-foreground">
                    Will publish immediately when saved
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Expiry Mode</Label>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Select
                    value={form.expiry_mode}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, expiry_mode: v }))
                    }
                  >
                    <SelectTrigger id="expiry_mode" className="w-full">
                      <SelectValue placeholder="Select expiry mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (no expiry)</SelectItem>
                      <SelectItem value="next_day">
                        Day after event date
                      </SelectItem>
                      <SelectItem value="duration">After duration</SelectItem>
                      <SelectItem value="exact">On exact date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.expiry_mode === 'duration' && (
                  <div className="space-y-2">
                    <Label htmlFor="expiry_days">Duration (days)</Label>
                    <Input
                      id="expiry_days"
                      type="number"
                      min={1}
                      value={form.expiry_days}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiry_days: e.target.value }))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      For “2 weeks”, enter 14.
                    </div>
                  </div>
                )}

                {form.expiry_mode === 'exact' && (
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expires On</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={form.expires_at}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expires_at: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="use_image"
                    type="checkbox"
                    checked={form.use_image}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, use_image: e.target.checked }))
                    }
                  />
                  <Label htmlFor="use_image">Use background image</Label>
                </div>

                {form.use_image && (
                  <div className="space-y-2">
                    <Label htmlFor="image_file">Announcement image</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="image_file"
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      {form.image_file && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearSelectedImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {form.image_url && !form.image_file ? (
                      <div className="text-xs text-muted-foreground">
                        Existing image will be kept unless you upload a new one.
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="overlay_color">Overlay color</Label>
                        <Input
                          id="overlay_color"
                          type="color"
                          value={form.overlay_color}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              overlay_color: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="overlay_opacity">
                          Overlay opacity (%)
                        </Label>
                        <Input
                          id="overlay_opacity"
                          type="number"
                          min={0}
                          max={100}
                          value={form.overlay_opacity}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              overlay_opacity: Number(e.target.value || 0),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!form.use_image && (
                  <div className="grid gap-2">
                    <Label htmlFor="banner_bg_color">Background color</Label>
                    <Input
                      id="banner_bg_color"
                      type="color"
                      value={form.banner_bg_color}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          banner_bg_color: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="text_color">Text (font) color</Label>
                  <Input
                    id="text_color"
                    type="color"
                    value={form.text_color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, text_color: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Preview</div>
                <AnnouncementPreviewCard preview={preview} />
                <div className="text-xs text-muted-foreground">
                  This preview matches the banner style used on the dashboard.
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-2">
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}

            <Button type="submit" disabled={posting}>
              {posting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              {posting
                ? editingId
                  ? 'Saving…'
                  : 'Posting…'
                : editingId
                  ? 'Save Changes'
                  : 'Post Announcement'}
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
          announcements.map((a) => {
            const isScheduled =
              a.publish_at && new Date(a.publish_at) > new Date();

            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg">{a.title}</CardTitle>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Badge variant="secondary" className="capitalize">
                        {a.target_audience || 'all'}
                      </Badge>

                      {isScheduled ? (
                        <Badge variant="outline" className="gap-1">
                          <CalendarClock className="h-3 w-3" />
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="outline">Live</Badge>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => beginEdit(a)}
                        title="Edit announcement"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        title="Delete announcement"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {a.event_date && (
                    <div className="text-xs text-muted-foreground">
                      Event: <b>{prettyEventDate(a.event_date)}</b>
                    </div>
                  )}

                  {a.publish_at && (
                    <div className="text-xs text-muted-foreground">
                      {isScheduled ? 'Publishes:' : 'Published:'}{' '}
                      <b>{new Date(a.publish_at).toLocaleString()}</b>
                    </div>
                  )}

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
            );
          })
        )}
      </div>
    </div>
  );
}

function AnnouncementPreviewCard({ preview }) {
  const {
    title,
    message,
    dateLine,
    imagePreviewUrl,
    useImage,
    textColor,
    bgColor,
    overlayColor,
    overlayOpacity,
  } = preview;

  return (
    <div
      className="relative rounded-xl overflow-hidden border shadow-xl h-28 md:h-32"
      style={
        useImage && imagePreviewUrl
          ? {
              backgroundImage: `url(${imagePreviewUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundColor: bgColor }
      }
    >
      {useImage && imagePreviewUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: hexWithAlpha(overlayColor, overlayOpacity),
          }}
        />
      )}

      <div className="relative h-full w-full px-4 md:px-6 flex items-center">
        <div style={{ color: textColor }} className="max-w-[85%]">
          <div className="text-[10px] md:text-xs uppercase opacity-80">
            Announcement
          </div>

          <div className="text-base md:text-lg font-semibold leading-tight line-clamp-1">
            {title}
          </div>

          {message && (
            <div className="text-xs md:text-sm opacity-90 line-clamp-2 mt-1">
              {message}
            </div>
          )}

          {dateLine && (
            <div className="text-[10px] md:text-xs opacity-80 mt-1">
              {dateLine}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function percentToHex(p) {
  const n = Math.round((Math.max(0, Math.min(100, p)) / 100) * 255);
  return n.toString(16).padStart(2, '0');
}

function hexWithAlpha(hex, p) {
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  return `${hex}${percentToHex(p)}`;
}
