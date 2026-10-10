import { NextResponse, type NextRequest } from 'next/server'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import { getAppContext } from '@/lib/context'
import { hasPerm } from '@/lib/permissions'

export const runtime = 'nodejs'
export const maxDuration = 60

// Simple per-user throttle (per server instance).
const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 60
const hits = new Map<string, number[]>()
function throttled(userId: string) {
  const now = Date.now()
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)
  if (arr.length >= LIMIT) return true
  arr.push(now)
  hits.set(userId, arr)
  return false
}

export interface OcrResult {
  supplier: string | null
  document_number: string | null
  date: string | null // YYYY-MM-DD
  amount: number | null
  currency: string | null
  tax_amount: number | null
  description: string | null
  category: string | null
}

/**
 * POST { image: "data:image/jpeg;base64,..." }
 * Reads a receipt with a vision model and returns structured fields for the
 * expense form. The image is not stored here (attach it separately).
 */
export async function POST(req: NextRequest) {
  const ctx = await getAppContext()
  if (!ctx || 'needsOnboarding' in ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!hasPerm(ctx.perms, 'expenses', 'add') && !hasPerm(ctx.perms, 'expenses', 'edit')) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  if (!env.openaiApiKey) {
    return NextResponse.json({ error: 'Receipt scanning is not configured. Add OPENAI_API_KEY to .env and restart the server.' }, { status: 503 })
  }
  if (throttled(ctx.userId)) return NextResponse.json({ error: 'Too many scans. Try again in a while.' }, { status: 429 })

  let body: { image?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const image = body.image ?? ''
  if (!image.startsWith('data:image/')) return NextResponse.json({ error: 'Send a base64 data URL of an image' }, { status: 400 })
  if (image.length > 12 * 1024 * 1024) return NextResponse.json({ error: 'Image too large (max ~8 MB)' }, { status: 413 })

  const categories = ctx.org.settings.categories?.expense ?? []
  const base = ctx.org.settings.base_currency ?? 'THB'

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      supplier: { type: ['string', 'null'], description: 'Merchant or supplier name' },
      document_number: { type: ['string', 'null'], description: 'Receipt / invoice / tax invoice number' },
      date: { type: ['string', 'null'], description: 'Document date as YYYY-MM-DD' },
      amount: { type: ['number', 'null'], description: 'Grand total paid, including tax' },
      currency: { type: ['string', 'null'], description: `ISO 4217 code, e.g. ${base}, EUR, USD` },
      tax_amount: { type: ['number', 'null'], description: 'VAT / tax amount if shown' },
      description: { type: ['string', 'null'], description: 'Short summary of what was bought (max 120 chars)' },
      category: { type: ['string', 'null'], enum: [...categories, null], description: 'One of the allowed categories' },
    },
    required: ['supplier', 'document_number', 'date', 'amount', 'currency', 'tax_amount', 'description', 'category'],
  } as const

  const prompt = `You read receipts and invoices for a small hotel's expense ledger. Extract the fields exactly as printed. Use ${base} as the currency when none is printed and the receipt is in the local language. Dates: convert any format (including Thai Buddhist year, e.g. 2569 = 2026) to YYYY-MM-DD. Amount is the grand total actually paid. Choose the single best category from: ${categories.join(', ')}. Return null for anything that is not present.`

  try {
    const client = new OpenAI({ apiKey: env.openaiApiKey })
    const response = await client.responses.create({
      model: env.openaiOcrModel,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: image, detail: 'high' },
          ],
        },
      ],
      text: { format: { type: 'json_schema', name: 'receipt', strict: true, schema } },
    })
    const text = response.output_text ?? ''
    const parsed = JSON.parse(text) as OcrResult
    if (parsed.category && !categories.includes(parsed.category)) parsed.category = null
    if (parsed.currency) parsed.currency = parsed.currency.toUpperCase().slice(0, 3)
    return NextResponse.json(parsed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OCR failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
