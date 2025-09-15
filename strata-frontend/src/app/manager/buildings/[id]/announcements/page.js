// src/app/manager/buildings/[id]/announcements/page.jsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
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
import { Loader2, RefreshCw, Trash2, Image as ImageIcon, X } from 'lucide-react';

// Small helper — make a random id for filename
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function AnnouncementsPage() {
  const params = useParams();
  const buildingId = params?.id;
  const supabase = useSupabaseClient();

  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', msg: string } | null
  const bannerTimerRef = useRef(null);



  const [announcements, setAnnouncements] = useState([]);

  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // optional admin controls

  useEffect(() => {
    (async () => {
      // admin check (optional)
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', uid)
          .maybeSingle();
        setIsAdmin(Boolean(prof?.is_admin));
      }

      // fetch presets (active only)
      const { data: pr } = await supabase
        .from('announcement_presets')
        .select('*')
        .eq('is_active', true)
        .order('title', { ascending: true });
      setPresets(pr || []);
    })();
  }, [supabase]);

  function presetImagePublicUrl(preset) {
    if (!preset?.image_path) return '';
    const { data } = supabase
      .storage
      .from('announcement-presets')
      .getPublicUrl(preset.image_path);
    return data?.publicUrl || '';
  }

  function applyPreset(preset) {
    if (!preset) return;
    setForm((f) => ({
      ...f,
      title: preset.title || '',
      subtitle: preset.subtitle || '',
      message: preset.message || '',
      target_audience: preset.target_audience || 'all',
      // style
      text_color: preset.text_color || f.text_color,
      banner_bg_color: preset.banner_bg_color || f.banner_bg_color,
      overlay_color: preset.overlay_color ?? f.overlay_color,
      overlay_opacity: typeof preset.overlay_opacity === 'number' ? preset.overlay_opacity : f.overlay_opacity,
      // image
      use_image: true,
      image_file: null,
      image_url: presetImagePublicUrl(preset),
      // DO NOT change event_date/expiry fields—user fills these
    }));
  }


  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    message: '',
    target_audience: 'all',
    event_date: '',          // yyyy-mm-dd (optional)
    expiry_mode: 'none',     // none | next_day | duration | exact
    expiry_days: '14',       // used if mode == duration
    expires_at: '',          // yyyy-mm-dd (optional, if mode == exact)
    // style / media (not required to store in DB unless you want to)
    use_image: true,
    image_file: null,        // File
    image_url: '',           // resolved URL after upload
    text_color: '#ffffff',
    banner_bg_color: '#1d4ed8',     // Tailwind's blue-700-ish default
    overlay_color: '#000000',
    overlay_opacity: 45,     // 0..100 (%)
  });

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const imageInputRef = useRef(null);

  useEffect(() => {
    if (buildingId) fetchAnnouncements();
  }, [buildingId]);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const fetchAnnouncements = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('building_id', buildingId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

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
    if (!form.use_image || !form.image_file) return null; // nothing to upload

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
      return null;
    }

    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
    return pub?.publicUrl || null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;

    setPosting(true);

    // auth
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user?.id) {
      console.error('User not authenticated');
      setPosting(false);
      return;
    }

    // Upload image (if toggled on)
    let finalImageUrl = form.image_url || null;
    if (form.use_image) {
      const uploaded = await uploadImageIfAny();
      if (uploaded) finalImageUrl = uploaded;
    }

    // event date
    const eventDateISO = form.event_date ? new Date(form.event_date).toISOString() : null;

    // expiry
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
      expires_at = form.expires_at ? new Date(form.expires_at).toISOString() : null;
    }

    // Build payload — include style fields if you’ve added them in DB; otherwise they’ll be ignored.
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || null,
      message: form.message.trim(),
      target_audience: form.target_audience,
      building_id: buildingId,
      created_by: userData.user.id,
      event_date: eventDateISO,
      expires_at,
      expires_after_days,
      image_url: finalImageUrl,                 // optional
      text_color: form.text_color || null,      // optional
      banner_bg_color: form.banner_bg_color || null,
      overlay_color: form.overlay_color || null,
      overlay_opacity: form.overlay_opacity,    // number 0..100; store if you add column
    };

    const { error } = await supabase.from('announcements').insert([payload]);

    if (error) {
      console.error('Insert error:', error);
      setBanner({ type: 'error', msg: 'Failed to post announcement. Please try again.' });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), 5000);
    } else {
      // reset form
      if (imageInputRef.current) imageInputRef.current.value = '';
      setForm((f) => ({
        ...f,
        title: '',
        subtitle: '',
        message: '',
        target_audience: 'all',
        event_date: '',
        expiry_mode: 'none',
        expiry_days: '14',
        expires_at: '',
        image_file: null,
        image_url: '',
      }));
      fetchAnnouncements();

      // success banner
      setBanner({ type: 'success', msg: 'Announcement posted successfully!' });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), 3500);
    }
    setPosting(false);
  };

  const handleDelete = async (id) => {
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
    }
    setDeletingId(null);
  };

  // ---------- PREVIEW COMPOSITION ----------
  const preview = {
    title: form.title || 'Announcement title',
    subtitle: form.subtitle || (form.message ? form.message.slice(0, 120) : 'Optional subtitle or first line of message…'),
    dateLine: form.event_date
      ? new Date(form.event_date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      : '',
    imagePreviewUrl: form.image_file ? URL.createObjectURL(form.image_file) : form.image_url || '',
    useImage: form.use_image,
    textColor: form.text_color || '#ffffff',
    bgColor: form.banner_bg_color || '#1d4ed8',
    overlayColor: form.overlay_color || '#000000',
    overlayOpacity: Math.max(0, Math.min(100, Number(form.overlay_opacity) || 0)), // %
  };

  return (
    <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
      {/* Floating success/error banner */}
      {banner && (
        <div
          className={[
            "fixed top-6 left-1/2 -translate-x-1/2 z-[9999]",
            "px-4 py-3 rounded-lg shadow-xl text-white",
            "transition-opacity duration-300 ease-out",
            banner.type === "success" ? "bg-emerald-600" : "bg-red-600"
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {/* simple dot icon */}
            <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
            <span className="font-medium">{banner.msg}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <Button variant="outline" size="sm" onClick={fetchAnnouncements} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Presets Picker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Announcement Presets</CardTitle>
            <span className="text-xs text-muted-foreground">
              Pick a preset; then set an event date.
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Preset select */}
            <div className="md:col-span-1 grid gap-2">
              <Label htmlFor="preset">Preset</Label>
              <Select
                value={selectedPresetId || ''}
                onValueChange={(v) => setSelectedPresetId(v || null)}
              >
                <SelectTrigger id="preset" className="w-full">
                  <SelectValue placeholder={presets.length ? 'Choose a preset…' : 'No presets yet'} />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event date (binds to the same form field the lower section uses) */}
            <div className="grid gap-2">
              <Label htmlFor="preset_event_date">Event date</Label>
              <Input
                id="preset_event_date"
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                // optional: prevent past dates
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            {/* Apply button */}
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                disabled={!selectedPresetId}
                onClick={() => {
                  const preset = presets.find(p => p.id === selectedPresetId);
                  applyPreset(preset);
                }}
              >
                Apply preset
              </Button>
            </div>
          </div>

          {/* Mini preview of the selected preset (unchanged) */}
          {selectedPresetId && (() => {
            const p = presets.find(pp => pp.id === selectedPresetId);
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
                      : p?.banner_bg_color || '#1d4ed8'
                  }}
                >
                  {url && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: `${p?.overlay_color || '#000000'}${(p?.overlay_opacity ?? 45)
                          .toString(16).padStart(2, '0')}`
                      }}
                    />
                  )}
                  <div className="relative h-full w-full px-4 md:px-6 flex items-center">
                    <div style={{ color: p?.text_color || '#fff' }}>
                      <div className="text-xs uppercase opacity-80">Announcement</div>
                      <div className="text-lg md:text-xl font-semibold leading-tight line-clamp-1">
                        {p?.title}
                      </div>
                      {p?.subtitle && (
                        <div className="text-sm opacity-90 line-clamp-1">{p.subtitle}</div>
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



      {/* Create / Edit */}
      <Card>
        <CardHeader>
          <CardTitle>Create new announcement</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Text fields */}
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
              <Label htmlFor="subtitle">Subtitle (optional)</Label>
              <Input
                id="subtitle"
                placeholder="Short supporting line"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
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

            {/* Audience & Event Date */}
            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="grid gap-2">
                <Label htmlFor="event_date">Event Date (optional)</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Expiry */}
            <div className="grid gap-2">
              <Label>Expiry Mode</Label>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Select
                    value={form.expiry_mode}
                    onValueChange={(v) => setForm((f) => ({ ...f, expiry_mode: v }))}
                  >
                    <SelectTrigger id="expiry_mode" className="w-full">
                      <SelectValue placeholder="Select expiry mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (no expiry)</SelectItem>
                      <SelectItem value="next_day">Day after event date</SelectItem>
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
                      placeholder="e.g., 14"
                      value={form.expiry_days}
                      onChange={(e) => setForm((f) => ({ ...f, expiry_days: e.target.value }))}
                    />
                    <div className="text-xs text-muted-foreground">For “2 weeks”, enter 14.</div>
                  </div>
                )}

                {form.expiry_mode === 'exact' && (
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expires On</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={form.expires_at}
                      onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Media + Styles */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left: Image + toggles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="use_image"
                    type="checkbox"
                    checked={form.use_image}
                    onChange={(e) => setForm((f) => ({ ...f, use_image: e.target.checked }))}
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
                        <Button type="button" variant="ghost" size="icon" onClick={clearSelectedImage}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="overlay_color">Overlay color</Label>
                        <Input
                          id="overlay_color"
                          type="color"
                          value={form.overlay_color}
                          onChange={(e) => setForm((f) => ({ ...f, overlay_color: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="overlay_opacity">Overlay opacity (%)</Label>
                        <Input
                          id="overlay_opacity"
                          type="number"
                          min={0}
                          max={100}
                          value={form.overlay_opacity}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, overlay_opacity: Number(e.target.value || 0) }))
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
                      onChange={(e) => setForm((f) => ({ ...f, banner_bg_color: e.target.value }))}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="text_color">Text (font) color</Label>
                  <Input
                    id="text_color"
                    type="color"
                    value={form.text_color}
                    onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                  />
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Preview</div>
                <AnnouncementPreviewCard preview={preview} />
                <div className="text-xs text-muted-foreground">
                  This preview matches the banner style used on the dashboard.
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" disabled={posting}>
              {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              {posting ? 'Posting…' : 'Post Announcement'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Separator />

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No announcements yet.</CardContent>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {a.target_audience || 'all'}
                    </Badge>
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
                {a.subtitle && <div className="text-sm">{a.subtitle}</div>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.message}</p>
                <div className="text-xs text-muted-foreground">
                  Posted: {new Date(a.created_at).toLocaleString()}
                  {a.expires_at && <> · Expires: {new Date(a.expires_at).toLocaleDateString()}</>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Visual preview card (matches dashboard banner behavior) ---------- */
function AnnouncementPreviewCard({ preview }) {
  const {
    title,
    subtitle,
    dateLine,
    imagePreviewUrl,
    useImage,
    textColor,
    bgColor,
    overlayColor,
    overlayOpacity,
  } = preview;

  const overlay = useImage
    ? `${overlayColor}${percentToHex(overlayOpacity)}`
    : null;

  return (
    <div
      className={[
        'relative rounded-xl overflow-hidden border shadow-xl',
        'h-28 md:h-32',
      ].join(' ')}
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
          style={{ backgroundColor: hexWithAlpha(overlayColor, overlayOpacity) }}
        />
      )}

      <div className="relative h-full w-full px-4 md:px-6 flex items-center justify-between">
        <div style={{ color: textColor }}>
          <div className="text-[10px] md:text-xs uppercase opacity-80">Announcement</div>
          <div className="text-base md:text-lg font-semibold leading-tight line-clamp-1">{title}</div>
          {subtitle && <div className="text-xs md:text-sm opacity-90 line-clamp-1">{subtitle}</div>}
          {dateLine && <div className="text-[10px] md:text-xs opacity-80 mt-1">{dateLine}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny color helpers ---------- */
function percentToHex(p) {
  // 0..100 -> 00..FF
  const n = Math.round((Math.max(0, Math.min(100, p)) / 100) * 255);
  return n.toString(16).padStart(2, '0');
}
function hexWithAlpha(hex, p) {
  // hex like #rrggbb, add alpha
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  return `${hex}${percentToHex(p)}`;
}
