import type { NextConfig } from 'next'

// The repo's .env uses SUPABASE_URL / SUPABASE_ANON_KEY. Next only exposes
// NEXT_PUBLIC_* to the browser, so map either naming to the public names here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''

let supabaseHost = ''
try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : ''
} catch {
  supabaseHost = ''
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  images: {
    remotePatterns: supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
}

export default nextConfig
