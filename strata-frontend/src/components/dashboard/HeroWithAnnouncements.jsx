'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';

/**
 * HeroWithAnnouncements
 * - Entire image is ALWAYS visible (object-contain, h-auto)
 * - Height auto-adjusts to active slide via ResizeObserver
 * - Max height capped per breakpoint to avoid overflow (no bars/jumps)
 */
export default function HeroWithAnnouncements({
  imageUrl,
  mobileImageUrl,
  desktopImageUrl,
  announcements = [],
  announcementsHref,
}) {
  const nowIso = new Date().toISOString();

  const validAnnouncements = announcements.filter((a) => {
    return !a.expires_at || new Date(a.expires_at) > new Date(nowIso);
  });

  const deckItems = [
    {
      id: 'building-hero',
      image_url: imageUrl || null,
      mobile_image_url: mobileImageUrl || imageUrl || null,
      desktop_image_url: desktopImageUrl || imageUrl || null,
      isBuilding: true,
    },
    ...validAnnouncements,
  ];

  return (
    // Removed pb-6 on mobile (kept md:pb-0 as-is since desktop unchanged)
    <section className="sticky top-4 z-10 md:top-6 md:pb-0">
      <AnnouncementsDeck items={deckItems} href={announcementsHref} />
    </section>
  );
}

function AnnouncementsDeck({ items, href }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const didSwipeRef = useRef(false); // ← add this

  const handlers = useSwipeable({
    onSwipeStart: () => {
      didSwipeRef.current = false;
    },
    onSwiping: () => {
      didSwipeRef.current = true;
    }, // ← mark movement
    onSwipedLeft: () => setIndex((i) => (i + 1) % items.length),
    onSwipedRight: () => setIndex((i) => (i - 1 + items.length) % items.length),
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Auto-fit container to active slide's height
  useEffect(() => {
    const el = containerRef.current;
    const activeSlide = slideRefs.current[index];
    if (!el || !activeSlide) return;

    const ro = new ResizeObserver(() => {
      el.style.height = `${activeSlide.offsetHeight}px`;
    });
    ro.observe(activeSlide);

    // initial height
    el.style.height = `${activeSlide.offsetHeight}px`;

    return () => ro.disconnect();
  }, [index]);

  if (!items?.length) return null;

  return (
    <div
      ref={containerRef}
      className="
        relative group w-full overflow-visible md:overflow-hidden rounded-2xl border border-border/20 bg-black
        transition-[height] duration-700 ease-[cubic-bezier(0.45,0,0.55,1)]
        shadow-[0_8px_32px_-8px_rgba(0,0,0,0.45)]
      "
    >
      <div
        {...handlers}
        onMouseDownCapture={(e) => e.preventDefault()} // ← stop native drag/select
        className="touch-pan-y select-none relative w-full h-full"
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
      >
        {items.map((item, i) => {
          const isActive = i === index;
          return (
            <div
              key={item.id ?? i}
              ref={(el) => (slideRefs.current[i] = el)}
              className={[
                'absolute inset-x-0 top-0 will-change-[opacity] transition-opacity duration-[750ms]',
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0',
              ].join(' ')}
            >
              {item.isBuilding ? (
                <BuildingSlide active={item} didSwipeRef={didSwipeRef} />
              ) : (
                <AnnouncementSlide
                  active={item}
                  href={href}
                  didSwipeRef={didSwipeRef}
                />
              )}
            </div>
          );
        })}
      </div>

      {items.length > 1 && (
        <>
          <DeckControls items={items} index={index} setIndex={setIndex} />
          <DeckDots items={items} index={index} setIndex={setIndex} />
        </>
      )}
    </div>
  );
}

function BuildingSlide({ active }) {
  const mobileSrc = active.mobile_image_url || active.image_url;
  const desktopSrc = active.desktop_image_url || active.image_url;

  return (
    <div className="relative md:rounded-none rounded-2xl overflow-hidden">
      {' '}
      {mobileSrc || desktopSrc ? (
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrc} />

          <img
            src={mobileSrc}
            alt="Building"
            className="
  block w-full
  h-auto
  object-contain
  bg-black
"
            loading="eager"
            decoding="async"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </picture>
      ) : (
        <div className="block w-full h-[44vh] sm:h-[48vh] md:h-[52vh] lg:h-[56vh] bg-gradient-to-br from-primary/40 via-primary/20 to-primary/10" />
      )}
      {/* Mobile-only: soft bottom fade so the image dissolves into the page */}
      <div className="absolute inset-x-0 bottom-0 h-16 md:hidden bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}

function AnnouncementSlide({ active, href }) {
  const hasImg = Boolean(active?.image_url);
  const hasDate = Boolean(active?.event_date);

  const formattedDate = hasDate
    ? new Date(active.event_date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="block relative bg-black">
      {/* ── MOBILE: overlay ── */}
      <div className="relative md:hidden">
        {hasImg ? (
          <img
            src={active.image_url}
            alt={active.title || 'Announcement'}
            className="block w-full h-auto object-contain select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        ) : (
          <div
            className="w-full"
            style={{
              aspectRatio: '4/3',
              background:
                active?.banner_bg_color ||
                'linear-gradient(to bottom right, #4f46e5, #6366f1)',
            }}
          />
        )}

        {/* Gradient overlay — tall enough to always show full text */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-6 pt-16 pointer-events-none flex flex-col justify-end">
          <p
            className="text-white font-bold text-lg leading-snug break-words"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {active.title}
          </p>
          {active.message && (
            <p
              className="text-white/90 text-sm leading-relaxed break-words whitespace-pre-wrap mt-1.5"
              style={{ textShadow: '0 1px 1px rgba(0,0,0,0.6)' }}
            >
              {active.message}
            </p>
          )}
          {hasDate && (
            <span
              className="inline-flex self-start items-center px-3 py-1 mt-2
          rounded-md bg-primary text-primary-foreground font-medium shadow-lg text-xs"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
            >
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      {/* ── DESKTOP: classic overlay ── */}
      <div className="hidden md:block relative">
        {hasImg ? (
          <img
            src={active.image_url}
            alt={active.title || 'Announcement'}
            className="block w-full h-auto object-contain select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        ) : (
          <div
            className="block w-full md:h-[48vh] lg:h-[52vh]"
            style={{
              background:
                active?.banner_bg_color ||
                'linear-gradient(to bottom right, #4f46e5, #6366f1)',
            }}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent pt-20 pb-[5vh] px-8 pointer-events-none flex flex-col justify-end">
          <div className="space-y-2 text-white max-w-[60%]">
            <div
              className="font-bold leading-tight break-words text-[clamp(1.4rem,3vw,2.8rem)]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              {active.title}
            </div>
            {active.message && (
              <div
                className="mt-2 leading-snug break-words whitespace-pre-wrap text-[clamp(1.05rem,2vw,1.25rem)]"
                style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
              >
                {active.message}
              </div>
            )}
            {hasDate && (
              <div
                className="inline-flex items-center px-4 py-1.5 mt-3
                  rounded-md bg-primary text-primary-foreground font-medium shadow-lg
                  text-[clamp(0.75rem,2vw,1rem)]"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
              >
                {formattedDate}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckControls({ items, index, setIndex }) {
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef(null);

  useEffect(() => {
    const reset = () => {
      clearTimeout(hideTimer.current);
      setVisible(true);
      hideTimer.current = setTimeout(() => setVisible(false), 2000);
    };
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    reset();
    return () => {
      clearTimeout(hideTimer.current);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
    };
  }, []);

  return (
    <div
      className={[
        'absolute inset-x-0 bottom-4 md:bottom-6 flex justify-between items-center px-3 sm:px-6 z-30 transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <button
        type="button"
        aria-label="Previous slide"
        onClick={(e) => {
          e.preventDefault();
          setIndex((i) => (i - 1 + items.length) % items.length);
          setVisible(true);
        }}
        className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 transition-all shadow-lg"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </button>

      <button
        type="button"
        aria-label="Next slide"
        onClick={(e) => {
          e.preventDefault();
          setIndex((i) => (i + 1) % items.length);
          setVisible(true);
        }}
        className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 transition-all shadow-lg"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </button>
    </div>
  );
}

function DeckDots({ items, index, setIndex }) {
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef(null);

  useEffect(() => {
    const reset = () => {
      clearTimeout(hideTimer.current);
      setVisible(true);
      hideTimer.current = setTimeout(() => setVisible(false), 2000);
    };
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    reset();
    return () => {
      clearTimeout(hideTimer.current);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
    };
  }, []);

  return (
    <div
      className={[
        'absolute bottom-3 sm:bottom-4 md:bottom-6 left-0 right-0 flex items-center justify-center gap-2 sm:gap-3 z-30 transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {items.map((_, i) => (
        <button
          key={i}
          aria-label={`Go to slide ${i + 1}`}
          onClick={(e) => {
            e.preventDefault();
            setIndex(i);
            setVisible(true);
          }}
          className={[
            'transition-all duration-300 rounded-full',
            i === index
              ? 'w-6 sm:w-8 h-1.5 bg-white shadow-lg'
              : 'w-2 sm:w-3 h-1.5 bg-white/50 hover:bg-white/80',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
