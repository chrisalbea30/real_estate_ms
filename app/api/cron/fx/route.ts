import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/context'

export const runtime = 'nodejs'

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

async function refreshRates() {
  const res = await fetch(ECB_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ECB returned ${res.status}`)
  const xml = await res.text()
  const date = xml.match(/<Cube time=["'](\d{4}-\d{2}-\d{2})["']/)?.[1] ?? new Date().toISOString().slice(0, 10)
  const rows: { base_currency: string; quote_currency: string; rate: number; source: string; fetched_at: string }[] = []
  for (const m of xml.matchAll(/<Cube currency=["']([A-Z]{3})["'] rate=["']([\d.]+)["']/g)) {
    rows.push({ base_currency: 'EUR', quote_currency: m[1]!, rate: Number(m[2]), source: `ECB ${date}`, fetched_at: new Date().toISOString() })
  }
  if (rows.length === 0) throw new Error('No rates found in the ECB feed')
  const admin = createAdminSupabase()
  const { error } = await admin.from('exchange_rates').upsert(rows, { onConflict: 'base_currency,quote_currency' })
  if (error) throw new Error(error.message)
  return { count: rows.length, date }
}

/** Scheduled refresh (Vercel cron sends Authorization: Bearer CRON_SECRET). */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const key = req.nextUrl.searchParams.get('key') ?? ''
  if (env.cronSecret && auth !== `Bearer ${env.cronSecret}` && key !== env.cronSecret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  try {
    return NextResponse.json(await refreshRates())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Refresh failed' }, { status: 502 })
  }
}

/** Manual refresh by any signed-in member (throttled to once per hour). */
export async function POST() {
  const ctx = await getAppContext()
  if (!ctx || 'needsOnboarding' in ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const admin = createAdminSupabase()
    const { data } = await admin.from('exchange_rates').select('fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle()
    if (data?.fetched_at && Date.now() - new Date(data.fetched_at).getTime() < 60 * 60 * 1000) {
      return NextResponse.json({ skipped: true, fetched_at: data.fetched_at })
    }
    return NextResponse.json(await refreshRates())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Refresh failed' }, { status: 502 })
  }
}
