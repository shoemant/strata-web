'use client';

import { motion, useInView } from 'framer-motion';
import {
  ClipboardList,
  Headphones,
  ArrowUpDown,
  Wrench,
  CheckCircle2,
  Puzzle,
  Quote,
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

export function PartnershipSection() {
  const headingRef = useRef(null);
  const inView = useInView(headingRef, { once: true, margin: '-80px' });
  const scrollToCta = () => {
    document.querySelector('#cta')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="partnership" className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
            OUR PARTNERSHIP
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Tailored Strata Excellence Through Collaboration
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            We don&apos;t just sell software. We embed ourselves in your
            workflow to ensure your property management portfolio thrives under
            a unified, modern ecosystem.
          </p>
        </motion.div>

        {/* Hero image */}
        <AnimatedCard delay={0.05} className="mb-8">
          <div className="rounded-2xl border border-white/10 overflow-hidden aspect-[16/7] relative">
            <Image
              src="/images/landing/apartment-stock.avif"
              alt="Modern boardroom with panoramic mountain views for team collaboration"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
          </div>
        </AnimatedCard>

        {/* Step cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Consultation & Strategy */}
          <AnimatedCard
            delay={0.1}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <span className="landing-icon-tile h-8 w-8 rounded-lg bg-background/10">
                <ClipboardList className="w-4 h-4" />
              </span>
              <span className="font-semibold">
                1. Consultation &amp; Strategy
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every strata portfolio is unique. We begin with a deep-dive audit
              of your current operations to build a roadmap that targets your
              specific friction points - from aging infrastructure to
              communication gaps.
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              {['Portfolio Audit', 'Custom KPIs', 'Workflow Mapping'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs border border-border text-muted-foreground bg-background/10"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </AnimatedCard>

          {/* 2. Ongoing Training */}
          <AnimatedCard
            delay={0.15}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-teal)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <span className="landing-icon-tile h-8 w-8 rounded-lg bg-background/10">
                <Headphones className="w-4 h-4" />
              </span>
              <span className="font-semibold">2. Ongoing Training</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Transitioning to new tech is only hard if you do it alone. We
              provide 24/7 priority support and personalized training sessions
              for your entire management team.
            </p>
            <button
              onClick={scrollToCta}
              className="mt-auto w-full py-2.5 rounded-xl border border-white/20 bg-foreground/10 text-foreground text-sm font-medium hover:bg-foreground/20 transition-colors"
            >
              Request Team Demo
            </button>
          </AnimatedCard>

          {/* 3. Data Migration */}
          <AnimatedCard
            delay={0.2}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <span className="landing-icon-tile h-8 w-8 rounded-lg bg-background/10">
                <ArrowUpDown className="w-4 h-4" />
              </span>
              <span className="font-semibold">3. Data Migration</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex flex-col gap-2 flex-1">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The heavy lifting is on us. Our specialist team handles the
                  secure transfer of all your historical documents, resident
                  lists, and financial records into the MyStrataApp environment.
                </p>
                <div className="flex flex-col gap-1.5 mt-2">
                  {['Zero Downtime Guarantee', 'ISO-Certified Security'].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden relative">
                <Image
                  src="/images/landing/apartment-stock.avif"
                  alt="Secure data center"
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            </div>
          </AnimatedCard>

          {/* 4. Custom Roadmap */}
          <AnimatedCard
            delay={0.25}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-steel)' }}
          >
            <div className="flex items-center gap-2 text-foreground">
              <span className="landing-icon-tile h-8 w-8 rounded-lg bg-background/10">
                <Wrench className="w-4 h-4" />
              </span>
              <span className="font-semibold">4. Custom Roadmap</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We build what&apos;s missing. If your portfolio requires a
              specific feature that doesn&apos;t exist yet, our engineering team
              works directly with you to develop and deploy it.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
              <Puzzle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Custom API Integrations</span>
            </div>
          </AnimatedCard>
        </div>

        <AnimatedCard
          delay={0.3}
          className="landing-card mt-4 rounded-2xl border border-white/10 p-6 md:p-8 grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr] gap-6 items-center"
          style={{ background: 'var(--surface-warm)' }}
        >
          <div className="flex gap-4">
            <span className="landing-icon-tile h-10 w-10 rounded-xl bg-background/10 text-primary">
              <Quote className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold text-foreground leading-snug">
                Built around the workflows strata teams already run every week.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Notices, invite-only access, folders, amenity rules, polls, and
                maintenance requests all share the same building context, so
                residents see what matters and managers keep the audit trail.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['5+', 'Core resident workflows'],
              ['1', 'Shared building record'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-background/10 p-4 text-center"
              >
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </section>
  );
}
