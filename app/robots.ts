import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/api', '/onboarding', '/invite', '/i/'] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  }
}
