'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Mail,
  User,
} from 'lucide-react';

const interests = [
  'Document migration',
  'Amenity booking',
  'Resident notices',
  'Digital polls',
  'Maintenance requests',
  'Custom workflows',
];

export default function RequestInfoPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:py-12">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>

        <div className="grid flex-1 grid-cols-1 gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="max-w-xl">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Request information
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Tell us what your building needs next.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              This is a temporary intake template for demo requests and pricing
              conversations. It keeps the landing page flow clean while the
              actual submission workflow is being built.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['15 min', 'Intro call'],
                ['No setup guesswork', 'Migration planning'],
                ['BC-local', 'Strata context'],
                ['Role-aware', 'Manager, owner, resident access'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="landing-card rounded-xl border border-white/10 p-4"
                  style={{ background: 'var(--surface-dark)' } as CSSProperties}
                >
                  <p className="text-lg font-semibold text-foreground">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            className="landing-card rounded-2xl border border-white/10 p-5 shadow-xl sm:p-7"
            style={{ background: 'var(--surface-dark)' } as CSSProperties}
          >
            {submitted ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <div className="landing-icon-tile h-14 w-14 rounded-2xl bg-primary/15 text-primary">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="mt-5 text-2xl font-bold">Request captured</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  This template is not connected to a backend yet, but the form
                  shape is ready for wiring up later.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                  Edit template
                </button>
              </div>
            ) : (
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitted(true);
                }}
              >
                <div>
                  <h2 className="text-2xl font-bold">Schedule or pricing request</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No data is sent anywhere yet. This is ready to connect when
                    the backend endpoint exists.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Name</span>
                    <span className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <input
                        required
                        className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder="Alex Chen"
                      />
                    </span>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Email</span>
                    <span className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <input
                        required
                        type="email"
                        className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder="alex@building.ca"
                      />
                    </span>
                  </label>
                </div>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Building or company</span>
                  <span className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <input
                      className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted-foreground"
                      placeholder="Harbour View Strata"
                    />
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Number of units</span>
                    <input
                      type="number"
                      min="1"
                      className="min-h-11 w-full rounded-xl border border-border bg-background/50 px-3 outline-none placeholder:text-muted-foreground"
                      placeholder="84"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Preferred timing</span>
                    <span className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <input
                        className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder="Next week"
                      />
                    </span>
                  </label>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">
                    What are you interested in?
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {interests.map((interest) => (
                      <label
                        key={interest}
                        className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/40 px-3 text-sm text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        {interest}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Notes</span>
                  <textarea
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border bg-background/50 px-3 py-3 outline-none placeholder:text-muted-foreground"
                    placeholder="Tell us about your current workflow, pain points, or rollout timeline."
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Save request template
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
