'use client';

import { motion, useInView } from 'framer-motion';
import {
  LayoutDashboard,
  Home,
  UserCircle,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Building2,
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

export function ManagementSection() {
  const headingRef = useRef(null);
  const inView = useInView(headingRef, { once: true, margin: '-80px' });
  const scrollToCta = () => {
    document.querySelector('#cta')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="managers" className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 text-balance">
            A View for Every Neighbor
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Seamless synchronization between management and residents, designed
            with accessibility at its core.
          </p>
        </motion.div>

        {/* Main bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Property Managers - large with image */}
          <AnimatedCard
            delay={0.05}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4 overflow-hidden"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="landing-icon-tile w-10 h-10 rounded-xl bg-background/10">
              <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Property Managers
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Centralize everything. Track building health, financial records,
                and maintenance requests through a single, intelligent dashboard
                built for heavy-duty management.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden mt-2 aspect-[16/9] relative">
              <Image
                src="/images/landing/apartment-stock.avif"
                alt="Property management dashboard on tablet"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </AnimatedCard>

          {/* Home Owners */}
          <AnimatedCard
            delay={0.1}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-mid)' }}
          >
            <div className="landing-icon-tile w-10 h-10 rounded-xl bg-background/10">
              <Home className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Home Owners
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Transparent access to strata documents, voting results, and
                financial reports. Your investment, managed with clarity.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
              {['1-Click Document Access', 'Secure Digital Voting'].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                )
              )}
            </div>
          </AnimatedCard>

          {/* Residents & Tenants */}
          <AnimatedCard
            delay={0.15}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-dark)' }}
          >
            <div className="landing-icon-tile w-10 h-10 rounded-xl bg-background/10">
              <UserCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Residents &amp; Tenants
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                An easy-to-use mobile experience for amenity booking,
                maintenance reporting, and building community notices.
              </p>
            </div>
            <div className="flex items-center justify-center mt-auto pt-4">
              <div className="landing-icon-tile w-16 h-28 rounded-2xl border-2 border-white/10 bg-background/5">
                <Building2 className="w-8 h-8 text-muted-foreground/40" />
              </div>
            </div>
          </AnimatedCard>

          {/* Custom Feature Development */}
          <AnimatedCard
            delay={0.2}
            className="landing-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-teal)' }}
          >
            <div className="landing-icon-tile w-10 h-10 rounded-xl bg-background/10">
              <Wrench className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Custom Feature Development
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Every building is unique. Need a specific workflow or a custom
                amenity booking system? Our development team builds what you
                need to make your strata flourish.
              </p>
            </div>
            <button
              onClick={scrollToCta}
              className="inline-flex items-center gap-2 text-sm text-foreground font-medium group mt-auto"
            >
              Tell us what you need
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </AnimatedCard>
        </div>
      </div>
    </section>
  );
}
