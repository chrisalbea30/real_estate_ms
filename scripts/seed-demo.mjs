// Fills ONE organisation with realistic demo data for presentations.
//
//   node scripts/seed-demo.mjs "Seaview Resort Co."            # refuses if bookings already exist
//   node scripts/seed-demo.mjs "Seaview Resort Co." --reset    # wipes that organisation's business data first
//   node scripts/seed-demo.mjs "Seaview Resort Co." --wipe     # only wipes, adds nothing
//
// Uses the service key from .env. Touches only rows of the named organisation
// (plus the shared exchange_rates table). Team, roles, rooms and settings stay.
import { readFileSync, existsSync } from 'node:fs'
import { createCipheriv, randomBytes } from 'node:crypto'

for (const line of existsSync('.env') ? readFileSync('.env', 'utf8').split(/\r?\n/) : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const URL_ = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const orgName = process.argv[2]
const RESET = process.argv.includes('--reset') || process.argv.includes('--wipe')
const WIPE_ONLY = process.argv.includes('--wipe')
if (!URL_ || !KEY || !orgName) {
  console.error('Usage: node scripts/seed-demo.mjs "<organisation name>" [--reset|--wipe]   (needs SUPABASE_URL and SUPABASE_SERVICE_KEY in .env)')
  process.exit(1)
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
async function api(method, path, body, extra = {}) {
  const res = await fetch(`${URL_}${path}`, { method, headers: { ...H, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}
const get = (path) => api('GET', `/rest/v1/${path}`)
async function insert(table, rows, { chunk = 100 } = {}) {
  const out = []
  for (let i = 0; i < rows.length; i += chunk) {
    out.push(...(await api('POST', `/rest/v1/${table}`, rows.slice(i, i + chunk), { Prefer: 'return=representation' })))
  }
  console.log(`  + ${String(out.length).padStart(4)} ${table}`)
  return out
}
const del = (table, filter) => api('DELETE', `/rest/v1/${table}?${filter}`)

// ---------- deterministic helpers ----------
let seed = 20261011
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296)
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p
const addDays = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10)
const diff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
const pad = (n, w = 2) => String(n).padStart(w, '0')
const round = (n, to = 50) => Math.round(n / to) * to

// ---------- organisation ----------
const orgs = await get(`organizations?select=*&name=eq.${encodeURIComponent(orgName)}`)
if (orgs.length !== 1) {
  console.error(`Expected exactly one organisation named "${orgName}", found ${orgs.length}`)
  process.exit(1)
}
const org = orgs[0]
const ORG = org.id
const prop = (await get(`properties?select=*&organization_id=eq.${ORG}&order=created_at&limit=1`))[0]
const PROP = prop.id
const BASE = org.settings.base_currency ?? 'THB'
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: prop.timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const YEAR = +TODAY.slice(0, 4)
const MONTH = +TODAY.slice(5, 7)
console.log(`Organisation: ${org.name}  ·  property: ${prop.name}  ·  today there: ${TODAY}  ·  base currency: ${BASE}`)

const existing = await get(`guests?select=id&organization_id=eq.${ORG}&limit=1`)
if (existing.length && !RESET) {
  console.error('This organisation already has bookings. Re-run with --reset to wipe its business data and seed again.')
  process.exit(1)
}

if (RESET) {
  console.log('Wiping business data of this organisation…')
  for (const t of ['invoices', 'guests', 'revenue', 'expenses', 'account_movements', 'founding_contributions', 'shareholder_work', 'shareholder_meetings', 'shareholders', 'todos', 'staff_hours', 'complaints', 'company_documents', 'web_credentials', 'room_inventory', 'room_fire_extinguishers', 'room_photos', 'budget_revenue', 'budget_expenses', 'budget_rent', 'budget_room_setup']) {
    await del(t, `organization_id=eq.${ORG}`)
  }
  if (WIPE_ONLY) {
    console.log('Done (wipe only).')
    process.exit(0)
  }
}

const rooms = await get(`rooms?select=*&property_id=eq.${PROP}&active=eq.true&order=number`)
if (rooms.length === 0) {
  console.error('Add rooms first (Rooms → Add room).')
  process.exit(1)
}
const pms = await get(`payment_methods?select=*&organization_id=eq.${ORG}`)
const pm = (name) => pms.find((p) => p.name === name) ?? pms[0]
const accounts = await get(`accounts?select=*&organization_id=eq.${ORG}`)

// ---------- exchange rates (shared table) ----------
try {
  const xml = await (await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')).text()
  const date = xml.match(/<Cube time=["'](\d{4}-\d{2}-\d{2})["']/)?.[1]
  const rows = [...xml.matchAll(/<Cube currency=["']([A-Z]{3})["'] rate=["']([\d.]+)["']/g)].map((m) => ({ base_currency: 'EUR', quote_currency: m[1], rate: +m[2], source: `ECB ${date}`, fetched_at: new Date().toISOString() }))
  await api('POST', '/rest/v1/exchange_rates?on_conflict=base_currency,quote_currency', rows, { Prefer: 'resolution=merge-duplicates' })
  console.log(`  + ${rows.length} exchange rates (ECB ${date})`)
} catch (e) {
  console.log('  ! could not load ECB rates:', e.message)
}
const rates = Object.fromEntries((await get('exchange_rates?select=quote_currency,rate&base_currency=eq.EUR')).map((r) => [r.quote_currency, +r.rate]))
const toBase = (amount, cur) => {
  if (cur === BASE) return { amount_base: amount, fx_rate: 1 }
  const from = cur === 'EUR' ? 1 : rates[cur]
  const to = BASE === 'EUR' ? 1 : rates[BASE]
  if (!from || !to) return { amount_base: null, fx_rate: null }
  const r = to / from
  return { amount_base: Math.round(amount * r * 100) / 100, fx_rate: +r.toFixed(6) }
}

// ---------- a sample file so attachments open ----------
const samplePath = `org/${ORG}/documents/demo-sample-document.png`
try {
  const res = await fetch(`${URL_}/storage/v1/object/tenant-files/${samplePath}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'image/png', 'x-upsert': 'true' }, body: readFileSync('public/icons/icon-512.png') })
  if (!res.ok) throw new Error(await res.text())
} catch (e) {
  console.log('  ! sample file upload failed:', e.message)
}

// ---------- settings polish (only fills blanks) ----------
const inv = org.settings.invoice ?? {}
const settings = {
  ...org.settings,
  invoice: {
    ...inv,
    company_name: inv.company_name || org.name,
    address: inv.address || '88 Beachfront Road\nSeaview Bay 6000',
    tax_id: inv.tax_id || '000-123-456-000',
    branch: inv.branch || 'Head Office',
    email: inv.email || 'frontdesk@seaview-resort.example',
    phone: inv.phone || '+63 900 000 0000',
    signatory: inv.signatory || 'General Manager',
  },
  external_links: org.settings.external_links?.length ? org.settings.external_links : [{ label: 'Tourism board portal', url: 'https://example.com/tourism-portal' }],
}
await api('PATCH', `/rest/v1/organizations?id=eq.${ORG}`, { settings })

// =====================================================================
// GUESTS
// =====================================================================
const FIRST = ['Maria', 'James', 'Sofia', 'Liam', 'Yuki', 'Hans', 'Chloe', 'Mateo', 'Aiko', 'Oliver', 'Ingrid', 'Noah', 'Camille', 'Lucas', 'Mei', 'Daniel', 'Elena', 'Arjun', 'Freya', 'Tomás', 'Hana', 'Ethan', 'Isabel', 'Kenji', 'Amelia', 'Rafael', 'Nora', 'Pierre', 'Lea', 'Samuel', 'Priya', 'Jonas', 'Carla', 'Viktor', 'Anya', 'Marco', 'Emma', 'Diego', 'Sara', 'Felix']
const LAST = ['Santos', 'Miller', 'Rossi', 'Tanaka', 'Schmidt', 'Dubois', 'Garcia', 'Andersson', 'Kim', 'Brown', 'Novak', 'Reyes', 'Laurent', 'Nakamura', 'Fischer', 'Silva', 'Cruz', 'Martin', 'Petrov', 'Wong', 'Jensen', 'Moreau', 'Bianchi', 'Hughes', 'Lim', 'Weber', 'Costa', 'Sato', 'Okafor', 'Lindqvist']
const SOURCES = ['Booking.com', 'Booking.com', 'Booking.com', 'Agoda', 'Agoda', 'Direct Booking', 'Direct Booking', 'Direct Booking', 'Airbnb', 'Expedia']
const usedNames = new Set()
const guestName = () => {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`
    if (!usedNames.has(n)) return usedNames.add(n), n
  }
}
const baseRate = (roomIdx) => [2800, 3200, 3600, 4200, 5200][roomIdx % 5]
const seasonal = (iso) => (['12', '01', '02', '03', '04'].includes(iso.slice(5, 7)) ? 1.25 : ['06', '09'].includes(iso.slice(5, 7)) ? 0.85 : 1)

const guestRow = (room, i, ci, co, over = {}) => {
  const nights = Math.max(1, diff(ci, co))
  const rate = round(baseRate(i) * seasonal(ci) * (0.95 + rnd() * 0.15), 50)
  const stay = rate * nights
  const name = guestName()
  const method = pick([pm('Bank Transfer'), pm('Card'), pm('Card'), pm('Cash')])
  const row = {
    organization_id: ORG, property_id: PROP, room: room.number, room_id: room.id,
    guest_name: name, guest_count: int(1, 3), check_in: ci, check_out: co,
    booking_source: pick(SOURCES), amount_thb_day: rate, amount_thb_stay: stay,
    paid: method.name, payment_method_id: method.id, payment: stay,
    payment_1_date: null, payment_1_amount: null, payment_2_date: null, payment_2_amount: null, payment_3_date: null, payment_3_amount: null,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`, phone: `+${int(30, 66)} ${int(600, 999)} ${int(100, 999)} ${int(1000, 9999)}`,
    notes: chance(0.2) ? pick(['Late arrival, after 22:00', 'Honeymoon, room decoration', 'Airport pickup requested', 'Vegetarian breakfast', 'Returning guest', 'Extra bed for child']) : null,
    passport_number: `P${int(1000000, 9999999)}`, passport_expiry: `${int(YEAR + 1, YEAR + 8)}-${pad(int(1, 12))}-${pad(int(1, 28))}`,
    tm30: true, add_to_revenue: true, show_on_legal: chance(0.35), file_url: null,
    ...over,
  }
  // split deposit + balance for longer stays
  if (!('payment' in over) && nights >= 4 && chance(0.5)) {
    const dep = round(stay * 0.3, 100)
    row.payment_1_date = addDays(ci, -int(7, 30)); row.payment_1_amount = dep
    row.payment_2_date = ci; row.payment_2_amount = stay - dep
  }
  return row
}

const guests = []
const START = `${YEAR}-01-02`
rooms.forEach((room, i) => {
  // history, ending a few days before today
  let d = addDays(START, int(0, 4))
  const stopBefore = addDays(TODAY, -6)
  while (d < stopBefore) {
    const nights = int(2, 6)
    const co = addDays(d, nights)
    if (co > stopBefore) break
    const g = guestRow(room, i, d, co)
    if (chance(0.06)) { g.payment = round(g.amount_thb_stay * 0.7, 100); g.payment_1_date = g.payment_1_amount = g.payment_2_date = g.payment_2_amount = null } // unpaid balance left behind
    guests.push(g)
    d = addDays(co, int(0, 4))
  }
})
// today's picture: one scenario per room (cycled), so the dashboards have something to show
const scenario = [
  (r, i) => [guestRow(r, i, addDays(TODAY, -3), addDays(TODAY, 2), { tm30: true })],                                             // in-house, paid
  (r, i) => [guestRow(r, i, addDays(TODAY, -4), TODAY, {}), guestRow(r, i, TODAY, addDays(TODAY, 3), { tm30: false })],          // departs today + arrives today
  (r, i) => { const g = guestRow(r, i, addDays(TODAY, -2), addDays(TODAY, 4), { tm30: false }); g.payment = round(g.amount_thb_stay * 0.4, 100); g.payment_1_date = g.payment_1_amount = g.payment_2_date = g.payment_2_amount = null; return [g] }, // in-house, balance due, TM30 pending
  (r, i) => [guestRow(r, i, addDays(TODAY, -5), addDays(TODAY, -1), {}), guestRow(r, i, addDays(TODAY, 1), addDays(TODAY, 5), { tm30: false })], // empty tonight, arriving tomorrow
  (r, i) => [guestRow(r, i, addDays(TODAY, -1), addDays(TODAY, 6), { tm30: true })],                                             // in-house, long stay
]
rooms.forEach((room, i) => guests.push(...scenario[i % scenario.length](room, i)))
// future bookings (next ~7 weeks): deposit only
rooms.forEach((room, i) => {
  let d = addDays(TODAY, int(7, 10))
  const end = addDays(TODAY, 50)
  while (d < end) {
    const nights = int(2, 6)
    const co = addDays(d, nights)
    const g = guestRow(room, i, d, co, { tm30: false })
    const dep = round(g.amount_thb_stay * 0.3, 100)
    Object.assign(g, { payment: dep, payment_1_date: addDays(TODAY, -int(1, 12)), payment_1_amount: dep, payment_2_date: null, payment_2_amount: null })
    guests.push(g)
    d = addDays(co, int(1, 6))
  }
})
// keys must be identical across rows for a bulk insert; recompute payment from splits
for (const g of guests) {
  const split = (g.payment_1_amount ?? 0) + (g.payment_2_amount ?? 0) + (g.payment_3_amount ?? 0)
  if (split > 0) g.payment = split
}
console.log('Seeding…')
await insert('guests', guests, { chunk: 50 })

// =====================================================================
// MANUAL REVENUE (non-booking income)
// =====================================================================
const manualRevenue = []
for (let m = 1; m <= MONTH; m++) {
  const day = (d) => `${YEAR}-${pad(m)}-${pad(Math.min(d, m === MONTH ? +TODAY.slice(8, 10) : 28))}`
  manualRevenue.push(
    { date: day(28), type: 'Other Income', supplier: 'Restaurant & bar takings', amount_thb: round(int(38000, 72000), 100), notes: 'Monthly total from POS', show_on_legal: true },
    { date: day(15), type: 'Other Income', supplier: 'Island tours commission', amount_thb: round(int(6000, 18000), 100), notes: null, show_on_legal: false },
    { date: day(20), type: 'Other Income', supplier: 'Laundry & airport transfers', amount_thb: round(int(4000, 11000), 100), notes: null, show_on_legal: false },
  )
  if (m % 3 === 0) manualRevenue.push({ date: day(10), type: 'Other Platform', supplier: 'Event: private beach dinner', amount_thb: round(int(25000, 60000), 500), notes: 'Group booking, paid by transfer', show_on_legal: true })
}
await insert('revenue', manualRevenue.map((r) => ({ organization_id: ORG, property_id: PROP, guest_id: null, file_url: null, ...r })))

// =====================================================================
// PARTNERS, CAPITAL, WORK, MEETINGS
// =====================================================================
const partnerDefs = [
  { name: 'Elena Marquez', role: 'Managing Partner', share_percentage: 40, amount_to_found_thb: 2000000, nationality: 'Spanish', bio: 'Runs the partnership and owner relations. Twenty years in boutique hospitality.' },
  { name: 'David Okonkwo', role: 'Finance Partner', share_percentage: 25, amount_to_found_thb: 1250000, nationality: 'British', bio: 'Oversees budgets, banking and reporting to the accountant.' },
  { name: 'Mika Sorensen', role: 'Operations Partner', share_percentage: 20, amount_to_found_thb: 1000000, nationality: 'Danish', bio: 'Works with the general manager on renovation and maintenance.' },
  { name: 'Lucia Ferreira', role: 'Silent Partner', share_percentage: 15, amount_to_found_thb: 750000, nationality: 'Portuguese', bio: 'Investor. Attends quarterly meetings.' },
]
const partners = await insert('shareholders', partnerDefs.map((p, i) => ({ organization_id: ORG, ...p, hour_rate: org.settings.partner_hour_rate ?? 200, email: `${p.name.split(' ')[0].toLowerCase()}@seaview-partners.example`, phone: `+63 91${i} 555 01${i}${i}`, joined_date: `${YEAR - 1}-0${i + 3}-15`, active: true })))
const P = Object.fromEntries(partners.map((p) => [p.name, p]))

const contrib = []
const paidShare = { 'Elena Marquez': 1, 'David Okonkwo': 1, 'Mika Sorensen': 0.8, 'Lucia Ferreira': 0.6 }
for (const p of partners) {
  const total = p.amount_to_found_thb * paidShare[p.name]
  const parts = [0.5, 0.3, 0.2]
  parts.forEach((f, i) => {
    const amt = round(total * f, 1000)
    const eur = rates[BASE] ? Math.round(amt / rates[BASE]) : null
    contrib.push({ organization_id: ORG, date: `${YEAR - (i === 0 ? 1 : 0)}-${pad(i === 0 ? 11 : i * 3)}-${pad(int(3, 25))}`, method: pick(['Bank Transfer', 'Bank Transfer', 'Wise']), shareholder: p.name, shareholder_id: p.id, amount_thb: amt, amount_eur: eur, notes: i === 0 ? 'Initial capital call' : i === 1 ? 'Second tranche' : 'Renovation top-up' })
  })
}
await insert('founding_contributions', contrib)

const work = []
for (let m = 1; m <= MONTH; m++) {
  for (const p of partners.slice(0, 3)) {
    if (p.name === 'Mika Sorensen' || chance(0.7)) work.push({ organization_id: ORG, month: `${YEAR}-${pad(m)}-01`, shareholder: p.name, shareholder_id: p.id, hours: int(6, 40), hour_rate: p.hour_rate })
  }
}
await insert('shareholder_work', work)

const names = partners.map((p) => p.name)
await insert('shareholder_meetings', [
  { meeting_date: `${YEAR}-01-20`, title: 'Annual planning meeting', participants: names, agenda: '1. Review of last year\n2. Budget for the year\n3. Renovation of rooms 4 and 5', decisions: 'Budget approved. Renovation of room 5 to start in the low season.', action_items: 'David: send the final budget to the accountant.\nMika: get three quotes for the bathroom works.' },
  { meeting_date: `${YEAR}-04-14`, title: 'Q1 review', participants: names.slice(0, 3), agenda: '1. Q1 results vs budget\n2. Online travel agency commissions\n3. Staff rota', decisions: 'Push direct bookings with a returning-guest discount of 10%.', action_items: 'Elena: update the website booking page.\nGM: train reception on upselling tours.' },
  { meeting_date: `${YEAR}-07-09`, title: 'Mid-year review and capital call', participants: names, agenda: '1. Half-year results\n2. Remaining capital contributions\n3. Solar water heating proposal', decisions: 'Solar proposal approved subject to financing. Remaining contributions due by year end.', action_items: 'Lucia and Mika: schedule the remaining transfers.\nDavid: cash-flow forecast to December.' },
  { meeting_date: addDays(TODAY, -12), title: 'High season readiness', participants: names.slice(0, 3), agenda: '1. Occupancy outlook\n2. Fire-safety inspection\n3. Pricing for December to February', decisions: 'High-season rates +25%. Replace the two fire extinguishers flagged by the inspection.', action_items: 'GM: book the extinguisher service.\nElena: publish the new rates.' },
].map((m) => ({ organization_id: ORG, attachments: m.title.startsWith('Annual') ? [{ name: 'Budget summary.png', url: samplePath }] : [], ...m })))

// =====================================================================
// EXPENSES
// =====================================================================
const partnerNames = names
const expenseDefs = [] // [day, category, subcategory, supplier, amount, currency, type, description, method, legal]
for (let m = 1; m <= MONTH; m++) {
  const last = m === MONTH ? +TODAY.slice(8, 10) : 28
  const d = (n) => `${YEAR}-${pad(m)}-${pad(Math.min(n, last))}`
  const push = (...a) => { if (+a[0].slice(8, 10) <= last) expenseDefs.push(a) }
  push(d(1), 'Rent', 'Land lease', 'Bayview Land Holdings', 85000, BASE, 'Fixed', 'Monthly land lease', 'Bank Transfer', true)
  push(d(5), 'Staff', 'Salaries', 'Payroll', round(int(128000, 142000), 500), BASE, 'Fixed', 'Staff salaries for the month', 'Bank Transfer', true)
  push(d(6), 'Staff', 'Social security', 'Social Security Office', round(int(9000, 11000), 100), BASE, 'Fixed', 'Employer contributions', 'Bank Transfer', true)
  push(d(8), 'Utilities', 'Electricity', 'Provincial Electric Co-op', round(int(21000, 38000), 50), BASE, 'Variable', 'Electricity bill', 'Bank Transfer', false)
  push(d(9), 'Utilities', 'Water', 'Seaview Water District', round(int(3500, 6500), 50), BASE, 'Variable', 'Water bill', 'Cash', false)
  push(d(10), 'Utilities', 'Internet', 'FiberLink Telecom', 2990, BASE, 'Fixed', 'Fibre internet and TV', 'Card', false)
  push(d(12), 'Operations', 'Supplies', 'Island Wholesale Market', round(int(9000, 21000), 10), BASE, 'Variable', 'Breakfast supplies and minibar restock', 'Cash', false)
  push(d(14), 'Operations', 'Laundry', 'Fresh Linen Services', round(int(6000, 12000), 10), BASE, 'Variable', 'Linen and towel laundry', 'Cash', false)
  push(d(17), 'Maintenance', pick(['Air conditioning', 'Plumbing', 'Pool', 'Garden']), pick(['CoolAir Service', 'Reyes Plumbing', 'BlueWave Pools', 'GreenThumb Gardens']), round(int(2500, 16000), 50), BASE, 'Variable', 'Routine maintenance visit', pick(['Cash', 'Bank Transfer']), false)
  push(d(19), 'Marketing', 'Commissions', 'Booking.com', round(int(14000, 32000), 10), 'EUR' === BASE ? BASE : BASE, 'Variable', 'Monthly commission invoice', 'Card', true)
  push(d(22), 'Operations', 'Supplies', 'CleanPro Supplies', round(int(3000, 7000), 10), BASE, 'Variable', 'Cleaning products and guest amenities', 'Card', false)
  push(d(25), 'Other', 'Bank fees', 'Metro Bank', int(350, 900), BASE, 'Fixed', 'Account and transfer fees', 'Bank Transfer', false)
  if (m % 2 === 0) push(d(16), 'Marketing', 'Advertising', 'Meta Ads', int(120, 260), 'USD', 'Variable', 'Social media campaign', 'Card', false)
  if (m % 3 === 1) push(d(20), 'Legal', 'Accounting', 'Cruz & Partners CPA', 18000, BASE, 'Fixed', 'Quarterly bookkeeping and tax filing', 'Bank Transfer', true)
  if (m % 4 === 2) push(d(23), 'Marketing', 'Software', 'Channel Manager GmbH', 89, 'EUR', 'Fixed', 'Channel manager subscription', 'Card', false)
  if (m === 2) push(d(11), 'Legal', 'Permits', 'Municipal Business Office', 24500, BASE, 'One-off', 'Annual business permit renewal', 'Bank Transfer', true)
  if (m === 5) push(d(13), 'Maintenance', 'Renovation', 'Santos Construction', 186000, BASE, 'CAPEX', 'Room 5 bathroom renovation', 'Bank Transfer', true)
  if (m === 6) push(d(18), 'Maintenance', 'Equipment', 'CoolAir Service', 64000, BASE, 'CAPEX', 'Two new inverter air conditioners', 'Bank Transfer', true)
  if (m === 8) push(d(7), 'Other', 'Insurance', 'Pacific Assurance', 46000, BASE, 'Fixed', 'Property and liability insurance, annual premium', 'Bank Transfer', true)
}
expenseDefs.sort((a, b) => a[0].localeCompare(b[0]))
const legalStatus = (date) => {
  const age = diff(date, TODAY)
  if (age < 25) return ['Pending', null, null]
  const r = rnd()
  if (r < 0.74) return ['Accepted', 'Receipt and supplier details in order.', addDays(date, int(8, 20))]
  if (r < 0.9) return ['Clarification Needed', 'Please attach the official receipt showing the tax number.', addDays(date, int(8, 20))]
  return ['Rejected', 'Personal expense, not deductible for the company.', addDays(date, int(8, 20))]
}
const expenses = expenseDefs.map(([date, category, subcategory, supplier, amount, currency, type, description, method, legal], i) => {
  const [st, notes, reviewed] = legal ? legalStatus(date) : ['Pending', null, null]
  const p = pm(method)
  const old = diff(date, TODAY) > 20
  return {
    organization_id: ORG, property_id: PROP,
    audit: old ? pick(['Checked', 'Checked', 'YES']) : 'To check',
    payment_date: date, transaction_number: `Expense ${pad(i + 1, 3)}`, document_number: pad(i + 1, 3),
    category, subcategory, supplier, amount, currency, ...toBase(amount, currency),
    method: p.name, payment_method_id: p.id, paid_by: method === 'Cash' ? 'General Manager' : pick(partnerNames.slice(0, 2)),
    type, description, is_legal: legal, legal_status: st, legal_notes: notes, legal_reviewed_at: reviewed,
    file_url: chance(0.82) ? samplePath : null,
  }
})
await insert('expenses', expenses, { chunk: 50 })

// opening balances so the cash position reads sensibly
for (const a of accounts) {
  await api('PATCH', `/rest/v1/accounts?id=eq.${a.id}`, { opening_balance: a.type === 'cash' ? 60000 : 450000, notes: a.type === 'cash' ? 'Front desk safe' : 'Main operating account' })
}
const bank = accounts.find((a) => a.type === 'bank') ?? accounts[0]
const cash = accounts.find((a) => a.type === 'cash') ?? accounts[0]
// the front desk banks its cash takings every month
const deposits = []
for (let m = 1; m <= MONTH; m++) {
  const on = `${YEAR}-${pad(m)}-${pad(Math.min(27, m === MONTH ? Math.max(1, +TODAY.slice(8, 10) - 2) : 27))}`
  const amt = m === MONTH ? 30000 : round(int(62000, 76000), 1000)
  deposits.push({ account_id: cash.id, amount: -amt, occurred_on: on, description: 'Cash takings deposited to the bank' }, { account_id: bank.id, amount: amt, occurred_on: on, description: 'Cash deposit from the front desk' })
}
await insert('account_movements', [
  ...deposits,
  { account_id: bank.id, amount: -40000, occurred_on: addDays(TODAY, -20), description: 'Cash withdrawal for the front desk float' },
  { account_id: cash.id, amount: 40000, occurred_on: addDays(TODAY, -20), description: 'Float received from the bank account' },
  { account_id: cash.id, amount: -1250, occurred_on: addDays(TODAY, -3), description: 'Cash count correction (till short)' },
].map((m) => ({ organization_id: ORG, source_table: 'adjustment', source_id: null, ...m })))

// =====================================================================
// ROOMS: inventory + fire safety
// =====================================================================
const inventory = []
const extinguishers = []
rooms.forEach((room, i) => {
  const items = [
    ['King bed', 'Furniture', 1], ['Bedside table', 'Furniture', 2], ['Wardrobe', 'Furniture', 1], ['Desk and chair', 'Furniture', 1],
    ['Air conditioner', 'Electronics', 1], ['Smart TV 43"', 'Electronics', 1], ['Mini fridge', 'Minibar', 1], ['Electric kettle', 'Kitchen', 1],
    ['Pillows', 'Bedding & Linen', 4], ['Duvet set', 'Bedding & Linen', 2], ['Bath towels', 'Bathroom', 4], ['Hair dryer', 'Bathroom', 1],
    ['In-room safe', 'Safety', 1], ['Smoke detector', 'Safety', 1], ['Framed print', 'Decoration', 2],
  ]
  for (const [name, category, quantity] of items) inventory.push({ organization_id: ORG, property_id: PROP, room_id: room.id, name, category, quantity, notes: name === 'Air conditioner' && i === 3 ? 'Serviced last month, filter replaced' : null })
  const expiry = i === 0 ? addDays(TODAY, -9) : i === 1 ? addDays(TODAY, 5) : i === 2 ? addDays(TODAY, 21) : addDays(TODAY, int(120, 400))
  extinguishers.push({ organization_id: ORG, property_id: PROP, room_id: room.id, location: 'Room', serial_number: `FX-${YEAR - 1}-${pad(int(100, 999), 3)}`, expiry_date: expiry, last_inspected: addDays(TODAY, -int(40, 200)), notes: i === 0 ? 'Needs replacing' : null })
})
extinguishers.push({ organization_id: ORG, property_id: PROP, room_id: rooms[0].id, location: 'Corridor', serial_number: `FX-${YEAR}-044`, expiry_date: addDays(TODAY, 300), last_inspected: addDays(TODAY, -30), notes: null })
await insert('room_inventory', inventory)
await insert('room_fire_extinguishers', extinguishers)

// =====================================================================
// TASKS, STAFF HOURS, COMPLAINTS
// =====================================================================
const T = (topic, department, responsible_person, days, status, status_notes = null, visible_to_gm = true) => ({ organization_id: ORG, property_id: PROP, project: 'General', department, topic, responsible_person, assignee_user_id: null, target_date: days === null ? null : addDays(TODAY, days), status, status_notes, visible_to_gm })
await insert('todos', [
  T('Replace expired fire extinguisher in Room 1', 'Operations', 'General Manager', -2, 'Pending', 'Supplier quote received'),
  T('Renew business permit documents for next year', 'Legal', 'David Okonkwo', 45, 'Pending'),
  T('Send Q3 expense pack to the accountant', 'Finance', 'David Okonkwo', -5, 'Ongoing', 'Two receipts still missing'),
  T('Publish high-season rates on all channels', 'Marketing', 'Elena Marquez', 3, 'Ongoing'),
  T('Deep clean and repaint Room 3 balcony', 'Renovation', 'General Manager', 10, 'Pending'),
  T('Hire a second receptionist for high season', 'HR', 'Elena Marquez', 20, 'Ongoing', 'Three interviews scheduled'),
  T('Service all air conditioners', 'Operations', 'General Manager', 0, 'Ongoing', 'Rooms 1 to 3 done'),
  T('Collect outstanding balance from departed guests', 'Finance', 'General Manager', -1, 'Pending'),
  T('Solar water heating: compare three quotes', 'Renovation', 'Mika Sorensen', 14, 'Pending'),
  T('Update photos on Booking.com and Agoda', 'Marketing', 'Elena Marquez', 7, 'Pending'),
  T('Pool pump warranty claim', 'Operations', 'Mika Sorensen', null, 'Blocked', 'Waiting for the supplier to reply'),
  T('Staff fire drill', 'HR', 'General Manager', 5, 'Pending'),
  T('Sign land lease addendum', 'Legal', 'Elena Marquez', -20, 'Complete', 'Signed and filed in Documents'),
  T('Install smoke detectors in all rooms', 'Operations', 'General Manager', -35, 'Complete'),
  T('Set up the channel manager', 'Marketing', 'David Okonkwo', -60, 'Complete'),
  T('Open the second bank account for card payouts', 'Finance', 'David Okonkwo', -15, 'Complete'),
  T('Order new linen for rooms 4 and 5', 'Operations', 'General Manager', 2, 'Pending'),
  T('Prepare partner meeting pack', 'Finance', 'David Okonkwo', 9, 'Pending', null, false),
])

const staff = [['Ana Reyes', 'Receptionist', 'Reception', 95], ['Jun Bautista', 'Housekeeper', 'Housekeeping', 80], ['Liza Mendoza', 'Housekeeper', 'Housekeeping', 80], ['Paolo Cruz', 'Maintenance Technician', 'Maintenance', 110], ['Grace Lim', 'Cook', 'Kitchen', 100], ['Marco Villanueva', 'General Manager', 'Management', 250]]
const hours = []
for (let back = 62; back >= 1; back--) {
  const date = addDays(TODAY, -back)
  const dow = new Date(date + 'T00:00:00Z').getUTCDay()
  staff.forEach(([staff_name, role, department, rate], i) => {
    if ((dow + i) % 7 === 0) return // one day off a week, staggered
    if (chance(0.06)) return
    hours.push({ organization_id: ORG, property_id: PROP, staff_name, role, department, date, hours: pick([8, 8, 8, 8, 9, 6, 8.5]), hourly_rate_thb: rate, notes: chance(0.04) ? 'Covered a colleague\'s shift' : null })
  })
}
await insert('staff_hours', hours)

const roomOf = (n) => rooms[(n - 1) % rooms.length]
const C = (back, room, category, severity, status, description, resolution_notes = null) => ({ organization_id: ORG, property_id: PROP, date: addDays(TODAY, -back), guest_name: pick(guests.filter((g) => g.room === roomOf(room).number)).guest_name, room: roomOf(room).number, room_id: roomOf(room).id, category, description, severity, status, resolution_notes, resolved_at: ['Resolved', 'Closed'].includes(status) ? addDays(TODAY, -Math.max(0, back - 1)) : null, filed_by: 'Ana Reyes' })
await insert('complaints', [
  C(1, 3, 'Maintenance', 'High', 'Open', 'Air conditioner dripping water onto the floor near the bed.'),
  C(2, 1, 'Noise', 'Medium', 'In Progress', 'Music from the beach bar after midnight.', 'Spoke to the bar manager, volume limit agreed from 23:00.'),
  C(0, 5, 'Safety', 'Critical', 'Open', 'Loose balcony railing on the sea side.'),
  C(6, 2, 'Cleanliness', 'Low', 'Resolved', 'Bathroom not fully cleaned on arrival.', 'Housekeeping re-cleaned within 20 minutes, complimentary drinks offered.'),
  C(11, 4, 'Amenities', 'Medium', 'Closed', 'Wi-Fi weak in the room.', 'Repeater installed in the corridor.'),
  C(18, 2, 'Service', 'Medium', 'Closed', 'Slow check-in, waited 25 minutes.', 'Apology and late check-out given. Second receptionist being hired.'),
  C(24, 5, 'Food & Beverage', 'Low', 'Closed', 'Breakfast ran out of fruit by 9:30.', 'Kitchen now restocks at 9:00.'),
  C(33, 1, 'Maintenance', 'High', 'Resolved', 'No hot water in the morning.', 'Heater element replaced the same day.'),
  C(47, 3, 'Cleanliness', 'Medium', 'Closed', 'Ants near the minibar.', 'Pest control visit, room sealed.'),
  C(4, 4, 'Amenities', 'Low', 'In Progress', 'Safe battery flat.', 'New batteries on order.'),
])

// =====================================================================
// DOCUMENTS + LOG-IN VAULT
// =====================================================================
const D = (name, category, back, notes) => ({ organization_id: ORG, property_id: PROP, name, category, document_date: addDays(TODAY, -back), file_url: samplePath, notes, uploaded_by: 'Admin' })
await insert('company_documents', [
  D('Company registration certificate', 'Legal', 420, 'Certified copy'),
  D('Land lease agreement (30 years)', 'Contracts', 400, 'Original with the lawyer'),
  D('Land lease addendum', 'Contracts', 20, 'Signed by all partners'),
  D(`Business permit ${YEAR}`, 'Permits', 240, 'Renew every January'),
  D('Fire safety inspection certificate', 'Certificates', 95, 'Valid for one year'),
  D('Property and liability insurance policy', 'Insurance', 65, 'Pacific Assurance, annual'),
  D(`VAT returns Q2 ${YEAR}`, 'Tax', 80, null),
  D('Bank account opening documents', 'Banking', 300, null),
  D('Staff employment contract template', 'HR', 200, null),
  D('Resort logo pack', 'Logo', 350, 'PNG and vector files'),
  D('Solar water heating proposal', 'Project', 30, 'Three quotes attached'),
])

const encKey = process.env.CREDENTIALS_ENCRYPTION_KEY ? Buffer.from(process.env.CREDENTIALS_ENCRYPTION_KEY, 'base64') : null
if (encKey?.length === 32) {
  const enc = (plain) => {
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', encKey, iv)
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
    return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`
  }
  await insert('web_credentials', [
    ['Booking.com extranet', 'https://admin.booking.com', 'seaview.resort', 'demo-Booking-2026!', 'Rates and availability'],
    ['Agoda YCS', 'https://ycs.agoda.com', 'frontdesk@seaview-resort.example', 'demo-Agoda-2026!', null],
    ['Airbnb host account', 'https://www.airbnb.com', 'frontdesk@seaview-resort.example', 'demo-Airbnb-2026!', 'Two-step code goes to the GM phone'],
    ['Online banking', 'https://example.com/bank', 'seaviewresortco', 'demo-Bank-2026!', 'View-only user'],
    ['Electricity account', 'https://example.com/electric', '00412887', 'demo-Power-2026!', null],
  ].map(([service_name, url, username, pw, notes]) => ({ organization_id: ORG, service_name, url, username, password_enc: enc(pw), notes, created_by: 'Admin' })))
} else {
  console.log('  ! CREDENTIALS_ENCRYPTION_KEY missing: skipped the log-in vault')
}

// =====================================================================
// BUDGET (current year)
// =====================================================================
await insert('budget_room_setup', rooms.map((r, i) => ({ organization_id: ORG, property_id: PROP, year: YEAR, room_name: r.name, high_season_rate_thb: round(baseRate(i) * 1.25, 50), low_season_rate_thb: round(baseRate(i) * 0.85, 50), target_occupancy_pct: 65, notes: null })))
const budRev = []
rooms.forEach((r, i) => {
  for (let m = 1; m <= 12; m++) {
    const iso = `${YEAR}-${pad(m)}-01`
    const high = seasonal(iso) > 1
    budRev.push({ organization_id: ORG, property_id: PROP, year: YEAR, month: m, room_name: r.name, amount_thb: round(baseRate(i) * seasonal(iso) * 30 * (high ? 0.72 : 0.58), 500), season: high ? 'High' : 'Low' })
  }
})
await insert('budget_revenue', budRev)
const budExp = []
const B = (category, item_name, monthly, expense_type = 'OPEX', months = null) => {
  for (let m = 1; m <= 12; m++) if (!months || months.includes(m)) budExp.push({ organization_id: ORG, property_id: PROP, year: YEAR, month: m, category, subcategory: null, item_name, amount_thb: monthly, expense_type })
}
B('Rent', 'Land lease', 85000)
B('Staff', 'Salaries', 135000)
B('Staff', 'Social security', 10000)
B('Utilities', 'Electricity', 28000)
B('Utilities', 'Water', 5000)
B('Utilities', 'Internet', 3000)
B('Operations', 'Supplies and laundry', 30000)
B('Maintenance', 'Routine maintenance', 9000)
B('Marketing', 'Commissions and advertising', 26000)
B('Legal', 'Accounting and permits', 18000, 'OPEX', [1, 2, 4, 7, 10])
B('Other', 'Bank fees and insurance', 4500)
B('Maintenance', 'Room 5 bathroom renovation', 180000, 'CAPEX', [5])
B('Maintenance', 'New air conditioners', 60000, 'CAPEX', [6])
B('Maintenance', 'Solar water heating', 240000, 'CAPEX', [11])
await insert('budget_expenses', budExp)
await insert('budget_rent', [0, 1, 2].map((i) => ({ organization_id: ORG, property_id: PROP, year_number: i + 1, year_label: `${YEAR - 1 + i}`, rent_thb: 1020000 + i * 51000, vat_amount: Math.round((1020000 + i * 51000) * ((org.settings.vat_rate ?? 0) / 100)) })))

// =====================================================================
// INVOICES for recently departed guests
// =====================================================================
const saved = await get(`guests?select=id,guest_name,room,check_in,check_out,amount_thb_stay,payment,email,phone,passport_number&organization_id=eq.${ORG}&check_out=lte.${TODAY}&order=check_out.desc&limit=12`)
const vat = +(org.settings.vat_rate ?? 0)
const invoices = saved.reverse().map((g, i) => {
  const total = +g.amount_thb_stay
  const subtotal = org.settings.prices_include_vat === false ? total : Math.round((total / (1 + vat / 100)) * 100) / 100
  const grand = org.settings.prices_include_vat === false ? Math.round(total * (1 + vat / 100) * 100) / 100 : total
  const nights = Math.max(1, diff(g.check_in, g.check_out))
  const room = rooms.find((r) => r.number === g.room)
  return {
    organization_id: ORG, property_id: PROP, guest_id: g.id, number: `${settings.invoice.prefix || 'INV'}-${YEAR}-${pad(i + 1, 4)}`, year: YEAR, seq: i + 1,
    issued_date: g.check_out, currency: BASE, subtotal, vat_rate: vat, vat_amount: Math.round((grand - subtotal) * 100) / 100, total: grand, deposit: +g.payment, balance_due: Math.round((grand - +g.payment) * 100) / 100,
    bill_to: { name: g.guest_name, email: g.email, phone: g.phone, passport: g.passport_number },
    lines: [{ description: `Room charge – ${room?.name ?? 'Room ' + g.room} (${g.check_in} → ${g.check_out})`, quantity: nights, unit_price: Math.round((subtotal / nights) * 100) / 100, amount: subtotal }],
    issuer: { ...settings.invoice, property_name: prop.name }, notes: settings.invoice.footer ?? null, status: 'issued',
  }
})
await insert('invoices', invoices)
await api('POST', '/rest/v1/invoice_counters?on_conflict=organization_id,year', [{ organization_id: ORG, year: YEAR, last_number: invoices.length }], { Prefer: 'resolution=merge-duplicates' })

// ---------- summary ----------
const inHouse = guests.filter((g) => g.check_in <= TODAY && g.check_out > TODAY).length
console.log(`\nDone. ${guests.length} bookings (${inHouse} in-house tonight), ${expenses.length} expenses, ${partners.length} partners.`)
