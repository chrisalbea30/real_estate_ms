import { BedDouble, LogIn, LogOut, Receipt, TrendingUp } from 'lucide-react'

/** A hand-built product preview: no screenshots, themes with the page. */
export function HeroMock() {
  const bars = [42, 55, 48, 70, 64, 82, 76, 90, 71, 88, 95, 84]
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gold-400/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-burgundy-950/80 p-4 shadow-pop backdrop-blur">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Seaview Resort · Today</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">EUR</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Arrivals', value: '3', icon: LogIn },
            { label: 'Departures', value: '2', icon: LogOut },
            { label: 'In-house', value: '7/10', icon: BedDouble },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.06] p-3">
              <s.icon className="h-4 w-4 text-gold-400" />
              <div className="mt-2 font-display text-2xl font-semibold text-white">{s.value}</div>
              <div className="text-[11px] text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-white/[0.06] p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white/60">Revenue · last 12 months</div>
              <div className="font-display text-xl font-semibold text-white">€148,600</div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3 w-3" /> +18%
            </span>
          </div>
          <div className="mt-3 flex h-16 items-end gap-1">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-burgundy-500 to-gold-400/90" style={{ height: `${h}%`, opacity: 0.55 + (i / bars.length) * 0.45 }} />
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { room: 'Room 4', name: 'M. Tanaka', note: 'Check-in 14:00 · TM30 pending', tone: 'bg-warning' },
            { room: 'Room 8', name: 'L. Dubois', note: 'Balance due €180', tone: 'bg-danger' },
          ].map((g) => (
            <div key={g.name} className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2">
              <span className={`h-2 w-2 rounded-full ${g.tone}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {g.room} · {g.name}
                </div>
                <div className="truncate text-[11px] text-white/60">{g.note}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-gold-400/40 bg-gold-400/5 px-3 py-2 text-[11px] text-gold-300">
          <Receipt className="h-3.5 w-3.5" />
          Receipt scanned: Island Market · €38 · Operations
        </div>
      </div>
    </div>
  )
}
