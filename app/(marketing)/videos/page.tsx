import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, Film, PlayCircle } from 'lucide-react'
import { APP_NAME } from '@/lib/brand'
import { SIGNUP_CTA } from '@/lib/plans'
import { ALL_CHAPTERS, PROMO, TOTAL_SECONDS, VIDEO_GROUPS, formatDuration } from '@/lib/videos'
import { Player, VideoLibrary } from '@/components/marketing/VideoLibrary'

export const metadata: Metadata = {
  title: 'Videos',
  description: `Watch ${APP_NAME} in action: a two-minute overview and ${ALL_CHAPTERS.length} short videos, one for each part of the product.`,
}

export default function VideosPage() {
  const totalMinutes = Math.round(TOTAL_SECONDS / 60)
  return (
    <>
      {/* The main video */}
      <section className="gradient-hero text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_1.35fr] lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-semibold text-gold-300">
              <Film className="h-3.5 w-3.5" /> Video tour
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">See {APP_NAME} in action</h1>
            <p className="mt-4 max-w-xl text-lg text-white/75">Start with the two-minute overview. Then pick any of the {ALL_CHAPTERS.length} short videos below to see one part of the product on its own.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-white/20 px-3 py-1">
                <b className="text-gold-300">{ALL_CHAPTERS.length + 1}</b> videos
              </span>
              <span className="rounded-full border border-white/20 px-3 py-1">
                <b className="text-gold-300">{totalMinutes + 2}</b> minutes in total
              </span>
              <span className="rounded-full border border-white/20 px-3 py-1">Most are under two minutes</span>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#contents" className="btn border border-white/25 bg-white/5 px-5 text-white hover:bg-white/10">
                <PlayCircle className="h-4 w-4" /> Browse the short videos
              </a>
              <Link href="/signup" className="btn bg-gold-400 px-5 text-burgundy-950 hover:bg-gold-300">
                {SIGNUP_CTA} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div>
            <div className="overflow-hidden rounded-3xl border border-white/15 shadow-pop">
              <Player src={PROMO.file} title={PROMO.title} eager />
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/65">
              <Clock className="h-4 w-4" /> {PROMO.title} · {formatDuration(PROMO.seconds)}
            </p>
          </div>
        </div>
      </section>

      {/* What is on this page */}
      <section id="contents" className="scroll-mt-20 border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">What is on this page</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-balance">One short video for each part of the product</h2>
            <p className="mt-3 text-ink-2">
              The videos follow the order of the menu inside {APP_NAME}. Each one shows a single screen being used, and under it you will find a plain explanation of what that screen is for, what you see in the video, and who it helps most. Watch them in order for the full tour, or jump straight to the part you care about.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VIDEO_GROUPS.map((g) => (
              <a key={g.name} href={`#${g.chapters[0]!.slug}`} className="rounded-2xl border border-line bg-canvas p-4 transition hover:border-primary/40 hover:bg-surface-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                  <span className="shrink-0 text-xs text-muted tabular">
                    {g.chapters.length} {g.chapters.length === 1 ? 'video' : 'videos'} · {formatDuration(g.chapters.reduce((s, c) => s + c.seconds, 0))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{g.blurb}</p>
                <p className="mt-2 text-sm text-ink-2">{g.chapters.map((c) => c.title).join(' · ')}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <VideoLibrary />

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="gradient-hero rounded-[2rem] px-6 py-12 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl font-semibold text-balance">Ready to try it with your own rooms?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Create a workspace in about a minute and record your first booking from your phone.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn bg-gold-400 px-6 text-base text-burgundy-950 hover:bg-gold-300">
              {SIGNUP_CTA} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/" className="btn border border-white/25 bg-white/5 px-6 text-base text-white hover:bg-white/10">
              Back to the overview
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
