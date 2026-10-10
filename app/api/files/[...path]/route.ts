import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { BUCKET } from '@/lib/storage'

// Resolves a tenant file path to a short-lived signed URL. The user's session
// is used, so the storage policies (organisation membership) apply.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const objectPath = path.map(decodeURIComponent).join('/')
  if (!objectPath.startsWith('org/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 120)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'File not found' }, { status: 404 })
  }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } })
}
