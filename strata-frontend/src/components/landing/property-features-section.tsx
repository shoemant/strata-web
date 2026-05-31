'use client';

import { motion, useInView } from 'framer-motion';
import {
  Megaphone,
  Vote,
  FolderOpen,
  CalendarDays,
  Users,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { useRef } from 'react';
import Image from 'next/image';

function AnimatedCard({
  children,
  className,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function PropertyFeaturesSection() {
  const headingRef = useRef(null);
  const inView = useInView(headingRef, { once: true, margin: '-80px' });

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-16"
        >
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
              High-Touch Service
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-primary leading-tight text-balance">
              Elevating the Property Management Standard.
            </h2>
          </div>
          <div>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              We don&apos;t just provide software; we become your engineering
              and design department, streamlining every administrative friction
              point.
            </p>
          </div>
        </motion.div>

        {/* Hero image */}
        <AnimatedCard delay={0.05} className="mb-4">
          <div className="rounded-2xl border border-white/10 overflow-hidden aspect-[16/7] relative">
            <Image
              src="/images/landing/apartment-stock.avif"
              alt="Modern Vancouver building exterior"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
          </div>
        </AnimatedCard>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
          {/* Announcements - wide */}
          <AnimatedCard
            delay={0.1}
            className="landing-card md:col-span-3 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <Megaphone className="w-4 h-4" />
              <span className="font-semibold text-base">Announcements</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Multi-channel communication that actually gets read. Send critical
              updates via high-priority push notifications and professional
              email templates simultaneously.
            </p>
            <div className="mt-auto bg-background/10 dark:bg-black/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                <span>Active Campaign</span>
                <span className="text-primary font-medium">
                  98% Delivery Rate
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="landing-icon-tile w-8 h-8 rounded-full bg-primary/20">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-background/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: '0%' }}
                    whileInView={{ width: '98%' }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    viewport={{ once: true }}
                  />
                </div>
              </div>
            </div>
          </AnimatedCard>

          {/* Democratic Polls */}
          <AnimatedCard
            delay={0.15}
            className="landing-card border border-white/10 md:col-span-2 rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-teal)' }}
          >
            <span className="landing-icon-tile w-10 h-10 rounded-xl bg-background/10">
              <Vote className="w-5 h-5 text-muted-foreground" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Democratic Polls
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Perfect for duplexes and self-managed buildings. Resolve
                disputes and reach consensus with auditable digital voting.
              </p>
            </div>
            <div className="mt-auto bg-background/10 dark:bg-black/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Next Meeting Vote:
              </p>
              {['Roof Repair Opt-in', 'Budget Approval 2024'].map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  className="w-full text-left py-2 px-3 rounded-lg text-sm text-foreground bg-background/10 mb-1 cursor-default"
                >
                  {item}
                </button>
              ))}
            </div>
          </AnimatedCard>

          {/* Concierge Setup - full width */}
          <AnimatedCard
            delay={0.2}
            className="landing-card border border-white/10 md:col-span-5 rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="flex flex-col gap-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                Concierge Setup
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Switching doesn&apos;t have to be hard. We handle the heavy
                lifting of document migration and organizational setup.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  'Migration of years of strata minutes & invoices.',
                  'Warranty info and asset management configuration.',
                  'Professional folder hierarchies designed for audit ease.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-background/10 dark:bg-black/20 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Building_Archive_2024</span>
              </div>
              {[
                {
                  name: 'Strata_Minutes_Q1.pdf',
                  status: 'Verified',
                  color: 'text-primary',
                },
                {
                  name: 'Roof_Warranty_Final.pdf',
                  status: 'Uploaded',
                  color: 'text-muted-foreground',
                },
                {
                  name: 'Insurance_Certificate.pdf',
                  status: 'Processing',
                  color: 'text-muted-foreground',
                },
              ].map(({ name, status, color }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background/10 dark:bg-black/10 hover:bg-background/20 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-foreground truncate flex-1">
                    {name}
                  </span>
                  <span className={`text-xs ${color} flex-shrink-0 ml-3`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </AnimatedCard>

          {/* Amenity Scheduling */}
          <AnimatedCard
            delay={0.25}
            className="landing-card border border-white/10 md:col-span-3 rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <CalendarDays className="w-4 h-4" />
              <span className="font-semibold text-base">
                Amenity Scheduling
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Integrated payments for guest suites and clubhouse rentals. Reduce
              administrative overhead with automated bookings and deposit
              handling.
            </p>
            <div className="flex gap-2 mt-auto">
              {['Pool Deck', 'Clubhouse'].map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  disabled
                  className="flex-1 py-3 rounded-xl border border-white/10 bg-background/5 text-sm text-muted-foreground font-medium cursor-default"
                >
                  {amenity}
                </button>
              ))}
            </div>
          </AnimatedCard>

          {/* Your Product Partner */}
          <AnimatedCard
            delay={0.3}
            className="landing-card border border-white/10 md:col-span-2 rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-steel)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-base">
                Your Product Partner
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We don&apos;t just build for everyone; we build for you. Request
              bespoke features and see them go from design to deployment in
              weeks, not years.
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-primary/20 border-2 border-surface-steel flex items-center justify-center"
                  >
                    <Users className="w-3 h-3 text-primary" />
                  </div>
                ))}
                <div className="w-7 h-7 rounded-full bg-foreground/10 border-2 border-surface-steel flex items-center justify-center">
                  <span className="text-[10px] text-foreground font-semibold">
                    +8
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Direct Slack access.
              </span>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </section>
  );
}
