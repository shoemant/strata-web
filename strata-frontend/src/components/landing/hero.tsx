'use client';

import { motion, type Variants } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.2,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
          {/* Left: Copy */}
          <div className="flex flex-col gap-6">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Built for Greater Vancouver strata teams
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] text-balance"
            >
              One calm place for notices, bookings, documents, and decisions.
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md"
            >
              MyStrataApp brings the daily work of strata living into one
              accessible portal for managers, owners, councils, and residents.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="#cta"
                className="px-6 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Book a Demo
              </Link>
              <button
                onClick={() => {
                  document
                    .querySelector('#features')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:bg-foreground/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                See Features
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-wrap gap-4 pt-2"
            >
              {['Concierge migration', 'BC-local support', 'Role-aware access'].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero image */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeRight}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl">
              <Image
                src="/images/landing/apartment-stock.avif"
                alt="Modern luxury apartment living room with panoramic city views"
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.6,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute -bottom-4 -left-4 sm:bottom-6 sm:left-6 bg-card/95 backdrop-blur border border-border rounded-xl px-4 py-3 shadow-xl flex items-start gap-3 max-w-[220px]"
            >
              <div className="landing-icon-tile w-6 h-6 rounded-full bg-primary/20 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Live rollout support
                </p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  We organize archives, invites, roles, and launch comms with
                  your team.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
