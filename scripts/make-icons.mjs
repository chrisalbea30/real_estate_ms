// Generates the PWA icons (PNG) without any image library: burgundy tile with
// a gold roofline and a cream door. Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(out, { recursive: true })

const TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const BURGUNDY = [128, 0, 32]
const GOLD = [227, 197, 101]
const CREAM = [251, 247, 243]

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  const cx = ax + t * dx, cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

/** Sample the logo in a 64x64 coordinate space. Returns [r,g,b,a]. */
function sample(u, v, { rounded, scale }) {
  // transform to logo space (0..64) centred
  const s = 64 / scale
  const x = (u - 32) * s + 32
  const y = (v - 32) * s + 32
  let bg = null
  if (rounded) {
    // rounded square 4..60 radius 16
    const r = 16
    const cx = Math.max(4 + r, Math.min(60 - r, x))
    const cy = Math.max(4 + r, Math.min(60 - r, y))
    if (Math.hypot(x - cx, y - cy) <= r) bg = BURGUNDY
  } else {
    bg = BURGUNDY
  }
  if (!bg) return [0, 0, 0, 0]
  // door frame
  if (x >= 24 && x <= 40 && y >= 36 && y <= 46) {
    if (x >= 30 && x <= 34 && y >= 39) return [...BURGUNDY, 255]
    return [...CREAM, 255]
  }
  // roofline stroke 4.5 wide, round caps
  const d = Math.min(distToSegment(x, y, 18, 36, 32, 22), distToSegment(x, y, 32, 22, 46, 36))
  if (d <= 2.25) return [...GOLD, 255]
  return [...bg, 255]
}

function render(size, opts) {
  const ss = 3 // supersampling
  return png(size, (px, py) => {
    let r = 0, g = 0, b = 0, a = 0
    for (let i = 0; i < ss; i++)
      for (let j = 0; j < ss; j++) {
        const u = ((px + (i + 0.5) / ss) / size) * 64
        const v = ((py + (j + 0.5) / ss) / size) * 64
        const [sr, sg, sb, sa] = sample(u, v, opts)
        r += sr * sa
        g += sg * sa
        b += sb * sa
        a += sa
      }
    if (a === 0) return [0, 0, 0, 0]
    return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / (ss * ss))]
  })
}

writeFileSync(join(out, 'icon-192.png'), render(192, { rounded: true, scale: 1 }))
writeFileSync(join(out, 'icon-512.png'), render(512, { rounded: true, scale: 1 }))
writeFileSync(join(out, 'apple-touch-icon.png'), render(180, { rounded: false, scale: 0.9 }))
writeFileSync(join(out, 'maskable-512.png'), render(512, { rounded: false, scale: 0.68 }))
console.log('icons written to', out)
