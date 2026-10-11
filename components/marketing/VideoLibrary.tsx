'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock, ListVideo } from 'lucide-react'
import { ALL_CHAPTERS, VIDEO_GROUPS, formatDuration, type VideoChapter } from '@/lib/videos'
import { cn } from '@/lib/format'

/** Pauses every other video on the page when one starts playing. */
function usePauseOthers() {
  useEffect(() => {
    const onPlay = (e: Event) => {
      document.querySelectorAll('video').forEach((v) => {
        if (v !== e.target && !v.paused) v.pause()
      })
    }
    document.addEventListener('play', onPlay, true)
    return () => document.removeEventListener('play', onPlay, true)
  }, [])
}

export function Player({ src, title, className, eager }: { src: string; title: string; className?: string; eager?: boolean }) {
  return (
    <video
      className={cn('aspect-video w-full bg-burgundy-950 object-contain', className)}
      controls
      playsInline
      // "#t=0.1" makes phones show the first frame instead of a black box.
      preload={eager ? 'metadata' : 'none'}
      src={eager ? `${src}#t=0.1` : src}
      aria-label={title}
    >
      Your browser cannot play this video. <a href={src}>Download it</a>.
    </video>
  )
}

/** Loads the video only when it scrolls near the screen, so the page opens fast. */
function LazyPlayer({ chapter }: { chapter: VideoChapter }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-line bg-burgundy-950 shadow-card">
      {near ? <Player src={chapter.file} title={chapter.title} eager /> : <div className="aspect-video w-full" />}
    </div>
  )
}

function Contents({ active, onNavigate }: { active: string | null; onNavigate?: () => void }) {
  let n = 0
  return (
    <nav aria-label="Videos on this page" className="space-y-4">
      {VIDEO_GROUPS.map((g) => (
        <div key={g.name}>
          <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.name}</div>
          <ol className="mt-1 space-y-0.5">
            {g.chapters.map((c) => {
              n++
              return (
                <li key={c.slug}>
                  <a
                    href={`#${c.slug}`}
                    onClick={onNavigate}
                    className={cn(
                      'grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-2 rounded-lg px-2 py-1.5 text-sm transition',
                      active === c.slug ? 'bg-primary-soft font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    <span className="font-display text-xs font-semibold text-muted tabular">{n}</span>
                    <span>{c.title}</span>
                    <span className="text-xs text-muted tabular">{formatDuration(c.seconds)}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </nav>
  )
}

export function VideoLibrary() {
  usePauseOthers()
  const [active, setActive] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    ALL_CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.slug)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  let n = 0
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 lg:py-16">
      {/* Contents: a drawer on phones, a sticky rail on desktop */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
        <button type="button" className="btn-secondary w-full justify-between lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="inline-flex items-center gap-2">
            <ListVideo className="h-4 w-4" /> Contents · {ALL_CHAPTERS.length} videos
          </span>
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
        <div className={cn('mt-3 lg:mt-0 lg:block', open ? 'block' : 'hidden')}>
          <div className="hidden px-2 pb-3 font-display text-lg font-semibold lg:block">Contents</div>
          <Contents active={active} onNavigate={() => setOpen(false)} />
        </div>
      </aside>

      <div className="min-w-0 space-y-14">
        {VIDEO_GROUPS.map((g) => (
          <section key={g.name} aria-labelledby={`g-${g.name.replace(/\W+/g, '-')}`}>
            <div className="mb-6 border-b border-line pb-3">
              <h2 id={`g-${g.name.replace(/\W+/g, '-')}`} className="font-display text-2xl font-semibold sm:text-3xl">
                {g.name}
              </h2>
              <p className="mt-1 text-muted">{g.blurb}</p>
            </div>
            <div className="space-y-12">
              {g.chapters.map((c) => {
                n++
                return (
                  <article key={c.slug} id={c.slug} className="scroll-mt-24">
                    <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-3xl font-semibold leading-none text-primary tabular">{n}</span>
                      <h3 className="font-display text-xl font-semibold sm:text-2xl">{c.title}</h3>
                      <span className="badge bg-surface-2 text-ink-2">
                        <Clock className="h-3 w-3" /> {formatDuration(c.seconds)}
                      </span>
                    </header>
                    <LazyPlayer chapter={c} />
                    <div className="mt-4 grid gap-5 md:grid-cols-[1.1fr_1fr]">
                      <div>
                        <p className="text-base leading-relaxed text-ink-2">{c.summary}</p>
                        <p className="mt-3 text-sm text-muted">
                          <span className="font-semibold text-ink-2">Most useful for:</span> {c.audience}
                        </p>
                      </div>
                      <div>
                        <div className="label">In this video</div>
                        <ul className="space-y-1.5 text-sm text-ink-2">
                          {c.points.map((p) => (
                            <li key={p} className="flex gap-2.5">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
