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
  // name,
  imageUrl,
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
      isBuilding: true,
    },
    ...validAnnouncements,
  ];

  return (
    <section className="relative z-10 pb-6 md:pb-0">
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
        relative group w-full overflow-hidden rounded-2xl border border-border/20 bg-black
        transition-[height] duration-700 ease-[cubic-bezier(0.45,0,0.55,1)]
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
  return (
    <div className="relative">
      {active.image_url ? (
        <>
          <img
            src={active.image_url}
            alt="Building"
            className="block w-full h-auto object-contain select-none max-h-[68vh] sm:max-h-[70vh] md:max-h-[72vh] lg:max-h-[75vh]"
            loading="eager"
            decoding="async"
            draggable={false} // ← add
            onDragStart={(e) => e.preventDefault()} // ← add
          />

          {/* ✅ Overlay removed */}
        </>
      ) : (
        <div className="block w-full h-[44vh] sm:h-[48vh] md:h-[52vh] lg:h-[56vh] bg-gradient-to-br from-primary/40 via-primary/20 to-primary/10" />
      )}

      {/* Title overlay placeholder — currently empty */}
      <div className="absolute inset-0 flex items-center justify-center text-center px-4"></div>
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

  // Give a touch more headroom when we show a date pill
  const imgMaxH = hasDate
    ? 'max-h-[76vh] sm:max-h-[78vh] md:max-h-[80vh] lg:max-h-[82vh]'
    : 'max-h-[68vh] sm:max-h-[70vh] md:max-h-[72vh] lg:max-h-[75vh]';

  return (
    <div className="block relative">
      <div className="relative">
        {hasImg ? (
          <img
            src={active.image_url}
            alt={active.title || 'Announcement'}
            className={[
              'block w-full h-auto object-contain select-none',
              imgMaxH,
            ].join(' ')}
            loading="lazy"
            decoding="async"
            draggable={false} // ← add
            onDragStart={(e) => e.preventDefault()} // ← add
          />
        ) : (
          <div
            className="block w-full h-[40vh] sm:h-[44vh] md:h-[48vh] lg:h-[52vh]"
            style={{
              background:
                active?.banner_bg_color ||
                'linear-gradient(to bottom right, #4f46e5, #6366f1)',
            }}
          />
        )}

        {/* Text stack - pushed to bottom-left */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end px-4 sm:px-6 md:px-8 pb-[6vh] pointer-events-none">
          <div className="space-y-2 text-white max-w-[90%] sm:max-w-[75%] md:max-w-[60%]">
            <div
              className="
                font-bold leading-tight line-clamp-2
                text-[clamp(1rem,5.2vw,2rem)]
                sm:text-[clamp(1.2rem,3.6vw,2.4rem)]
                md:text-[clamp(1.4rem,3vw,2.8rem)]
              "
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              {active.title}
            </div>
            {active.message && (
              <div
                className="
           mt-2 leading-snug break-words line-clamp-3
           text-[clamp(0.9rem,3.2vw,1.1rem)]
          sm:text-[clamp(1rem,2.4vw,1.2rem)]
          md:text-[clamp(1.05rem,2vw,1.25rem)]
        "
                style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
              >
                {active.message}
              </div>
            )}
            {hasDate && (
              <div
                className="
            inline-flex items-center px-3 sm:px-4 py-1.5 mt-3
            rounded-md bg-primary text-primary-foreground font-medium shadow-lg
            text-[clamp(0.75rem,2vw,1rem)]
                "
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
