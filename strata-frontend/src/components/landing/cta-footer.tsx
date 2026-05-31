'use client';

import { motion, useInView } from 'framer-motion';
import { Building2, Phone, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'For Managers', href: '#managers' },
      { label: 'Partnership', href: '#partnership' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#partnership' },
      { label: 'Contact', href: '#cta' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Login', href: '/login' },
    ],
  },
];

export function CtaFooter() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <footer id="cta" className="bg-background border-t border-border">
      {/* CTA Banner */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16"
      >
        <div
          id="pricing"
          className="landing-card rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10"
          style={{ background: 'var(--surface-dark)' } as React.CSSProperties}
        >
          <div className="max-w-md">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-balance">
              Ready for a Better Strata Management Experience?
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Book your initial consultation today. We&apos;ll map your current
              workflows, migration needs, and pricing around the size of your
              building or portfolio.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/request-info"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Phone className="w-4 h-4" />
              Schedule Call
            </Link>
            <Link
              href="/request-info"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LayoutGrid className="w-4 h-4" />
              Get Pricing
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Footer links */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">
              My<span className="text-primary">Strata</span>App
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Modern strata management for Greater Vancouver. Designed for owners,
            managers, and residents alike.
          </p>
        </div>

        {footerGroups.map(({ title, links }) => (
          <div key={title} className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {title}
            </p>
            <ul className="flex flex-col gap-2">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>(c) 2026 MyStrataApp. All rights reserved.</span>
          <span>Built for the Greater Vancouver strata community.</span>
        </div>
      </div>
    </footer>
  );
}
