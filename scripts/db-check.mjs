// Verifies the Supabase project is ready for the app: 0001 + 0002 applied,
// the private bucket exists, and auth email sign-ups are enabled.
// Run: npm run db:check   (reads .env in the repo root)
import { readFileSync, existsSync } from 'node:fs'

function loadEnv() {
  if (!existsSync('.env')) return
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const service = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!url || !service) {
  console.error('✗ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env')
  process.exit(1)
}

const headers = { apikey: service, Authorization: `Bearer ${service}` }
let failures = 0
const ok = (msg) => console.log('✓', msg)
const bad = (msg) => {
  failures++
  console.log('✗', msg)
}

async function tableExists(name) {
  const res = await fetch(`${url}/rest/v1/${name}?select=*&limit=0`, { headers })
  return res.status === 200 || res.status === 206
}

const base = ['rooms', 'guests', 'revenue', 'expenses']
const saas = ['organizations', 'properties', 'memberships', 'org_roles', 'accounts', 'payment_methods', 'account_movements', 'invoices', 'audit_log', 'profiles']

for (const t of base) (await tableExists(t)) ? ok(`table ${t} (0001)`) : bad(`table ${t} missing: run migrations/0001_initial_schema.sql`)
for (const t of saas) (await tableExists(t)) ? ok(`table ${t} (0002)`) : bad(`table ${t} missing: run migrations/0002_saas_tenancy.sql`)

// Column added by 0002 on a 0001 table
const col = await fetch(`${url}/rest/v1/guests?select=organization_id&limit=0`, { headers })
col.status === 200 || col.status === 206 ? ok('guests.organization_id present') : bad('guests.organization_id missing: run migrations/0002_saas_tenancy.sql')

// 0003: plan limits
const seats = await fetch(`${url}/rest/v1/organizations?select=extra_seats&limit=0`, { headers })
seats.status === 200 || seats.status === 206 ? ok('plan limits (0003)') : bad('organizations.extra_seats missing: run migrations/0003_plans_and_limits.sql (limits are still checked by the app, but not locked in the database)')

// RPC functions
const rpc = await fetch(`${url}/rest/v1/rpc/app_role_template`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_role: 'Owner' }) })
rpc.ok ? ok('function app_role_template()') : bad('function app_role_template() missing or PostgREST schema cache stale (run: notify pgrst, \'reload schema\';)')

// Storage bucket
const buckets = await fetch(`${url}/storage/v1/bucket`, { headers })
const list = buckets.ok ? await buckets.json() : []
const bucket = Array.isArray(list) ? list.find((b) => b.id === 'tenant-files') : null
if (bucket) {
  bucket.public ? bad('bucket tenant-files is PUBLIC; it must be private') : ok('bucket tenant-files (private)')
} else {
  const create = await fetch(`${url}/storage/v1/bucket`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'tenant-files', name: 'tenant-files', public: false, file_size_limit: 10485760 }) })
  create.ok ? ok('bucket tenant-files created (private)') : bad(`bucket tenant-files missing and could not be created: ${await create.text()}`)
}

// Auth settings
if (anon) {
  const auth = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } })
  if (auth.ok) {
    const s = await auth.json()
    s.external?.email ? ok('auth: email provider enabled') : bad('auth: email provider disabled (Authentication → Providers)')
    s.disable_signup ? bad('auth: sign-ups are disabled') : ok('auth: sign-ups enabled')
    console.log('  info: email confirmation', s.mailer_autoconfirm ? 'OFF (auto-confirm)' : 'ON (users must click the email link)')
  }
}

console.log('\nRemember: Authentication → URL Configuration → add  http://localhost:3000/auth/callback  (and your production URL) to Redirect URLs.')
process.exit(failures ? 1 : 0)
