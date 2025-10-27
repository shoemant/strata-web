"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

/* =================== HERO WITH ANNOUNCEMENTS =================== */
export default function HeroWithAnnouncements({ name, imageUrl, announcements = [], announcementsHref }) {
  const deckItems = [
    {
      id: "building-hero",
      image_url: imageUrl || null,
      title: name || "—",
      isBuilding: true,
    },
    ...announcements,
  ]

  return (
    <section className="relative z-10 pb-6 md:pb-0">
      <AnnouncementsDeck items={deckItems} href={announcementsHref} />
    </section>
  )
}
function AnnouncementsDeck({ items, href }) {
  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState(0)
  const containerRef = useRef(null)
  const slideRefs = useRef([])

  useEffect(() => {
    if (!items || items.length <= 1) return
    const id = setInterval(() => {
      setPrev(index)
      setIndex((i) => (i + 1) % items.length)
    }, 8000)
    return () => clearInterval(id)
  }, [items, index])

  // ✅ Observe and auto-adjust container height
  useEffect(() => {
    const el = containerRef.current
    const activeSlide = slideRefs.current[index]
    if (!el || !activeSlide) return

    const resizeObserver = new ResizeObserver(() => {
      el.style.height = `${activeSlide.offsetHeight}px`
    })
    resizeObserver.observe(activeSlide)

    // Set initial height
    el.style.height = `${activeSlide.offsetHeight}px`

    return () => resizeObserver.disconnect()
  }, [index])

  if (!items?.length) return null

  return (
    <div
      ref={containerRef}
      className="relative group w-full overflow-hidden rounded-2xl border border-border/20 transition-[height] duration-700 ease-[cubic-bezier(0.45,0,0.55,1)]"
    >
      {items.map((item, i) => {
        const isActive = i === index
        return (
          <div
            key={item.id}
            ref={(el) => (slideRefs.current[i] = el)}
            className={[
              "absolute inset-x-0 top-0 transition-opacity duration-[2000ms] ease-[cubic-bezier(0.45,0,0.55,1)] will-change-[opacity]",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0",
            ].join(" ")}
          >
            {item.isBuilding ? (
              <BuildingSlide active={item} />
            ) : (
              <AnnouncementSlide active={item} href={href} />
            )}
          </div>
        )
      })}

      {items.length > 1 && (
        <>
          <DeckControls items={items} index={index} setIndex={setIndex} />
          <DeckDots items={items} index={index} setIndex={setIndex} />
        </>
      )}
    </div>
  )
}


function BuildingSlide({ active }) {
  return (
    <div className="relative flex justify-center bg-black/90">
      {active.image_url ? (
        <img
          src={active.image_url}
          alt="Building hero"
          className="w-full h-auto max-h-[80vh] object-contain select-none transition-transform duration-700 ease-in-out"
          loading="eager"
          decoding="async"
        />
      ) : (
        <div className="w-full h-64 bg-gradient-to-br from-primary/40 via-primary/20 to-primary/10" />
      )}

      {/* Overlay gradient & title */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/40 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center text-center px-4">
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-widest text-white drop-shadow-xl">
          {active.title}
        </h1>
      </div>
    </div>
  )
}

function AnnouncementSlide({ active, href }) {
  const hasImg = Boolean(active?.image_url)
  const formattedDate = active?.event_date
    ? new Date(active.event_date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <Link href={href} className="block relative">
      {/* ====== Image / background ====== */}
      <div className="relative flex justify-center bg-black/90">
        {hasImg ? (
          <img
            src={active.image_url}
            alt={active.title || "Announcement"}
            className="w-full h-auto max-h-[80vh] object-contain select-none"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-full h-auto"
            style={{
              background:
                active.banner_bg_color ||
                "linear-gradient(to bottom right, #4f46e5, #6366f1)",
              height: "400px",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* ====== Responsive overlay text (safe-fit) ====== */}
      {/* Content overlay */}
<div className="absolute inset-0 z-20 flex flex-col justify-center px-4 sm:px-6 md:px-8 pointer-events-none">
  <div className="space-y-2 text-white max-w-[90%] sm:max-w-[80%]">
    <div className="text-[2.8vw] sm:text-[1.6vw] md:text-sm uppercase opacity-80 tracking-wider font-medium">
      Announcement
    </div>

    <div className="font-bold leading-tight line-clamp-2 text-[clamp(1rem,5vw,2rem)] sm:text-[clamp(1.3rem,3.5vw,2.5rem)] md:text-[clamp(1.6rem,3vw,2.8rem)]">
      {active.title}
    </div>

    {active.subtitle && (
      <div className="opacity-90 line-clamp-3 break-words text-[clamp(0.85rem,3.2vw,1.1rem)] sm:text-[clamp(0.9rem,2.4vw,1.2rem)] md:text-[clamp(1rem,2vw,1.25rem)] leading-snug">
        {active.subtitle}
      </div>
    )}

    {formattedDate && (
      <div className="inline-flex items-center px-[3vw] sm:px-4 py-[1vw] sm:py-2 mt-3 rounded-lg bg-primary text-primary-foreground font-semibold shadow text-[clamp(0.7rem,2.5vw,1rem)]">
        {formattedDate}
      </div>
    )}
  </div>
</div>

    </Link>
  )
}



/* =================== DECK CONTROLS (AUTO-HIDE ARROWS) =================== */
function DeckControls({ items, index, setIndex }) {
  const [visible, setVisible] = useState(true)
  const hideTimer = useRef(null)

  // Auto-hide after 2 s of inactivity
  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(hideTimer.current)
      setVisible(true)
      hideTimer.current = setTimeout(() => setVisible(false), 1)
    }

    window.addEventListener("mousemove", resetTimer)
    window.addEventListener("touchstart", resetTimer)

    resetTimer() // initial trigger
    return () => {
      clearTimeout(hideTimer.current)
      window.removeEventListener("mousemove", resetTimer)
      window.removeEventListener("touchstart", resetTimer)
    }
  }, [])

  return (
    <div
      className={[
        "absolute inset-x-0 bottom-6 flex justify-between items-center px-3 sm:px-6 z-30 transition-opacity duration-500 ease-in-out",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {/* Prev Button */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={(e) => {
          e.preventDefault()
          setIndex((i) => (i - 1 + items.length) % items.length)
          setVisible(true)
        }}
        className="
          pointer-events-auto inline-flex items-center justify-center
          w-9 h-9 sm:w-11 sm:h-11 rounded-full
          bg-black/40 hover:bg-black/60
          backdrop-blur-md border border-white/20
          transition-all duration-300 shadow-lg
        "
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </button>

      {/* Next Button */}
      <button
        type="button"
        aria-label="Next slide"
        onClick={(e) => {
          e.preventDefault()
          setIndex((i) => (i + 1) % items.length)
          setVisible(true)
        }}
        className="
          pointer-events-auto inline-flex items-center justify-center
          w-9 h-9 sm:w-11 sm:h-11 rounded-full
          bg-black/40 hover:bg-black/60
          backdrop-blur-md border border-white/20
          transition-all duration-300 shadow-lg
        "
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </button>
    </div>
  )
}

/* =================== DECK DOTS (AUTO-HIDE TOO) =================== */
function DeckDots({ items, index, setIndex }) {
  const [visible, setVisible] = useState(true)
  const hideTimer = useRef(null)

  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(hideTimer.current)
      setVisible(true)
      hideTimer.current = setTimeout(() => setVisible(false), 1)
    }

    window.addEventListener("mousemove", resetTimer)
    window.addEventListener("touchstart", resetTimer)
    resetTimer()
    return () => {
      clearTimeout(hideTimer.current)
      window.removeEventListener("mousemove", resetTimer)
      window.removeEventListener("touchstart", resetTimer)
    }
  }, [])

  return (
    <div
      className={[
        "absolute bottom-3 sm:bottom-4 left-0 right-0 flex items-center justify-center gap-2 sm:gap-3 z-30 transition-opacity duration-500 ease-in-out",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {items.map((_, i) => (
        <button
          key={i}
          aria-label={`Go to slide ${i + 1}`}
          onClick={(e) => {
            e.preventDefault()
            setIndex(i)
            setVisible(true)
          }}
          className={[
            "transition-all duration-300 rounded-full",
            i === index
              ? "w-6 sm:w-8 h-1.5 bg-white shadow-lg"
              : "w-2 sm:w-3 h-1.5 bg-white/50 hover:bg-white/80",
          ].join(" ")}
        />
      ))}
    </div>
  )
}
