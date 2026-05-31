'use client';

import { motion, useInView } from 'framer-motion';
import { Database, FolderTree, Megaphone, Users } from 'lucide-react';
import { useRef } from 'react';
import Image from 'next/image';

const steps = [
  {
    number: 1,
    icon: Database,
    title: 'Data Migration',
    description:
      'We transfer your historical archives and active records securely.',
  },
  {
    number: 2,
    icon: FolderTree,
    title: 'Folder Structuring',
    description:
      'Bylaws, minutes, and reports organized logically for your council.',
  },
  {
    number: 3,
    icon: Users,
    title: 'Resident Invite-Only Launch',
    description:
      'We manage the rollout to ensure every resident is onboarded smoothly.',
  },
];

export function OnboardingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 text-balance">
                Personalized Onboarding &amp; Setup
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                Transitioning to new software is hard. We make it easy. Our team
                personally handles all document migration, folder hierarchies,
                and user permission setups.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {steps.map(({ number, icon: Icon, title, description }, i) => (
                <motion.div
                  key={number}
                  initial={{ opacity: 0, x: -16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    delay: 0.1 + i * 0.1,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex gap-4"
                >
                  <div className="landing-icon-tile w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {number}. {title}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{
              delay: 0.15,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="rounded-2xl border border-white/10 overflow-hidden aspect-[4/3] relative shadow-2xl">
              <Image
                src="/images/landing/apartment-stock.avif"
                alt="Two professionals reviewing onboarding documentation on a tablet"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </motion.div>
        </div>

        {/* Building Notice banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: '-60px' }}
          className="landing-card border border-white/10 mt-12 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ background: 'var(--surface-dark)' } as React.CSSProperties}
        >
          <div className="landing-icon-tile w-10 h-10 rounded-full bg-primary/15">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">
              Building Notice: Summer BBQ Prep
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 leading-relaxed">
              Roof deck maintenance scheduled for next Tuesday. Community spaces
              will remain open with limited access. Check the portal for
              details.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="flex-shrink-0 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium whitespace-nowrap cursor-default"
          >
            Sample Notice
          </button>
        </motion.div>
      </div>
    </section>
  );
}
