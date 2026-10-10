// Server-side environment access. Accepts both the repo's .env naming
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY) and the
// conventional NEXT_PUBLIC_* / SUPABASE_SERVICE_ROLE_KEY naming.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '',
  openaiOcrModel: process.env.OPENAI_OCR_MODEL || 'gpt-5-mini',
  credentialsKey: process.env.CREDENTIALS_ENCRYPTION_KEY || '',
  cronSecret: process.env.CRON_SECRET || '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
}

export function assertSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY in .env')
  }
}
