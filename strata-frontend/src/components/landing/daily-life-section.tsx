'use client';

import { motion } from 'framer-motion';
import {
  Megaphone,
  CalendarDays,
  FileText,
  Waves,
  Dumbbell,
  Film,
  BookOpen,
  Shield,
  Scale,
  Receipt,
  ChevronRight,
  Plus,
  Users,
  Eye,
  Pointer,
  MonitorSpeaker,
} from 'lucide-react';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

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

export function DailyLifeSection() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <section id="features" className="bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          ref={sectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
            Life simplified, daily.
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Building Notices card - large left */}
          <AnimatedCard
            delay={0.05}
            className="landing-card md:col-span-3 border border-white/10 rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: 'var(--surface-dark)' } as React.CSSProperties}
          >
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-3">
                <Megaphone className="w-3.5 h-3.5" />
                <span>Building Notices</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Rooftop Summer Social
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Join your neighbors this Saturday for drinks and snacks on the
                sky lounge. All residents welcome!
              </p>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1">
                {[
                  'https://api.dicebear.com/7.x/personas/svg?seed=Felix',
                  'https://api.dicebear.com/7.x/personas/svg?seed=Anita',
                  'https://api.dicebear.com/7.x/personas/svg?seed=Mia',
                ].map((src, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-surface-mid border-2 border-surface-dark overflow-hidden -ml-1 first:ml-0 flex items-center justify-center"
                    style={{ zIndex: 3 - i }}
                  >
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-surface-dark flex items-center justify-center -ml-1">
                  <span className="text-xs font-semibold text-primary">
                    +12
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-lg border border-primary/30 text-primary/80 text-sm font-medium cursor-default"
              >
                Sample RSVP
              </button>
            </div>
          </AnimatedCard>

          {/* Amenity Booking card - right */}
          <AnimatedCard
            delay={0.1}
            className="landing-card md:col-span-2 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
            style={
              { background: 'var(--surface-steel)' } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Amenity Booking</span>
            </div>
            <h3 className="text-xl font-bold text-foreground leading-snug">
              Your space, on your schedule.
            </h3>
            <div className="flex flex-col gap-2">
              {[
                {
                  icon: Waves,
                  name: 'Pool Deck',
                  status: 'Available Today',
                  available: true,
                },
                {
                  icon: Dumbbell,
                  name: 'Fitness Center',
                  status: 'Peak Hours 5PM-8PM',
                  available: false,
                },
                {
                  icon: Film,
                  name: 'Private Cinema',
                  status: 'Booked: 7PM Tonight',
                  available: false,
                },
              ].map(({ icon: Icon, name, status, available }) => (
                <div
                  key={name}
                  className="flex items-center justify-between bg-background/10 dark:bg-black/20 rounded-xl px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="landing-icon-tile h-8 w-8 rounded-lg bg-background/10">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {name}
                      </p>
                      <p
                        className={`text-xs ${available ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {status}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled
              className="mt-auto w-full py-3 rounded-xl bg-primary/80 text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-default"
            >
              <Plus className="w-4 h-4" />
              Sample Booking
            </button>
          </AnimatedCard>

          {/* Document Hub card */}
          <AnimatedCard
            delay={0.15}
            className="landing-card md:col-span-3 rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-dark)' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>Document Hub</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-foreground">
                  Everything in one place.
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Appliance manuals, strata bylaws, and insurance certificates
                  are just a tap away.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:ml-auto flex-shrink-0">
                {[
                  { icon: BookOpen, label: 'Manuals' },
                  { icon: Shield, label: 'Insurance' },
                  { icon: Scale, label: 'Bylaws' },
                  { icon: Receipt, label: 'Receipts' },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/10 dark:bg-black/20 w-20 cursor-default"
                  >
                    <Icon className="w-5 h-5 text-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Accessibility callout */}
        <AnimatedCard
          delay={0.2}
          className="landing-card border border-white/10 mt-4 rounded-2xl p-8 md:p-12 flex flex-col items-center gap-6 text-center"
          style={{ background: 'var(--surface-dark)' } as React.CSSProperties}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Friendly for everyone.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
            We designed MyStrataApp with high contrast, large touch targets, and
            clear language to ensure that every resident - from tech-savvy
            students to retired homeowners - can navigate with total confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mt-2">
            {[
              { icon: Eye, label: 'High Clarity' },
              { icon: Pointer, label: 'Easy Targets' },
              { icon: MonitorSpeaker, label: 'Screen Reader Ready' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="landing-icon-tile w-14 h-14 rounded-2xl bg-background/10 dark:bg-black/20">
                  <Icon className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </section>
  );
}
