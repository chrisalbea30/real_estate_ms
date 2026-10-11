import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/app', '/onboarding', '/api/ocr', '/api/files', '/api/export']
const AUTH_ONLY_PAGES = ['/login', '/signup']

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Layouts cannot read the pathname; pass it along for module gating.
  const withPath = () => {
    const h = new Headers(request.headers)
    h.set('x-pathname', path)
    return NextResponse.next({ request: { headers: h } })
  }

  let response = withPath()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = withPath()
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refreshes the session cookie when needed. Do not remove.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (!claims && startsWithAny(path, PROTECTED)) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', path + request.nextUrl.search)
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  if (claims && startsWithAny(path, AUTH_ONLY_PAGES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|videos/|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?|mp4|webm|mov)$).*)',
  ],
}
