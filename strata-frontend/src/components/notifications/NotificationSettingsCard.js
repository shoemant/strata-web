'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function NotificationSettingsCard({
  value,
  onChange,
  entityLabel = 'item',
  allowTiming = false,
  allowReminder = false,
  audienceOptions = [
    { value: 'all', label: 'All residents' },
    { value: 'owners', label: 'Owners only' },
    { value: 'tenants', label: 'Tenants only' },
  ],
}) {
  const safeValue = {
    send_email: false,
    audience: 'all',
    send_timing: 'now',
    custom_subject: '',
    send_reminder: false,
    reminder_hours_before: 24,
    ...value,
  };

  const update = (patch) => {
    onChange({
      ...safeValue,
      ...patch,
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Notification Settings</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            id={`${entityLabel}-send-email`}
            type="checkbox"
            className="mt-1"
            checked={safeValue.send_email}
            onChange={(e) => update({ send_email: e.target.checked })}
          />

          <div className="space-y-1">
            <Label htmlFor={`${entityLabel}-send-email`}>
              Send email notification
            </Label>
            <p className="text-sm text-muted-foreground">
              Send this {entityLabel} to residents by email in addition to
              showing it in the app.
            </p>
          </div>
        </div>

        {safeValue.send_email && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${entityLabel}-audience`}>
                  Email audience
                </Label>
                <Select
                  value={safeValue.audience}
                  onValueChange={(v) => update({ audience: v })}
                >
                  <SelectTrigger
                    id={`${entityLabel}-audience`}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    {audienceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {allowTiming ? (
                <div className="grid gap-2">
                  <Label htmlFor={`${entityLabel}-timing`}>Email timing</Label>
                  <Select
                    value={safeValue.send_timing}
                    onValueChange={(v) => update({ send_timing: v })}
                  >
                    <SelectTrigger
                      id={`${entityLabel}-timing`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send immediately</SelectItem>
                      <SelectItem value="on_publish">
                        Send when it goes live
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div
                className={`grid gap-2 ${
                  allowTiming ? 'md:col-span-2' : 'md:col-span-2'
                }`}
              >
                <Label htmlFor={`${entityLabel}-subject`}>
                  Custom email subject (optional)
                </Label>
                <Input
                  id={`${entityLabel}-subject`}
                  placeholder="Leave blank to auto-generate the subject"
                  value={safeValue.custom_subject}
                  onChange={(e) => update({ custom_subject: e.target.value })}
                />
              </div>
            </div>

            {allowReminder ? (
              <>
                <div className="flex items-start gap-3">
                  <input
                    id={`${entityLabel}-send-reminder`}
                    type="checkbox"
                    className="mt-1"
                    checked={safeValue.send_reminder}
                    onChange={(e) =>
                      update({ send_reminder: e.target.checked })
                    }
                  />

                  <div className="space-y-1">
                    <Label htmlFor={`${entityLabel}-send-reminder`}>
                      Send reminder email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send a reminder before this {entityLabel} starts.
                    </p>
                  </div>
                </div>

                {safeValue.send_reminder && (
                  <div className="grid gap-2 md:max-w-xs">
                    <Label htmlFor={`${entityLabel}-reminder-hours`}>
                      Reminder lead time (hours)
                    </Label>
                    <Input
                      id={`${entityLabel}-reminder-hours`}
                      type="number"
                      min={1}
                      max={168}
                      value={safeValue.reminder_hours_before}
                      onChange={(e) =>
                        update({
                          reminder_hours_before: Number(e.target.value || 24),
                        })
                      }
                    />
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
