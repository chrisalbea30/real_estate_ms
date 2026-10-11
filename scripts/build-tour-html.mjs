// Builds the presenter page from docs/DEMO-TOUR.md (+ group names from
// docs/DEMO-TOUR-CONTENTS.md).
//
//   node scripts/build-tour-html.mjs [live-site-url] [extra-output-for-artifact]
//
// Writes docs/DEMO-TOUR.html (open it in any browser). Re-run after editing the
// markdown. The page lets the presenter switch every link between the live
// site and localhost, tick sections off and filter to the short version.
import { readFileSync, writeFileSync } from 'node:fs'

const LIVE = (process.argv[2] || 'https://real-estate-ms-mu.vercel.app').replace(/\/$/, '')
const LOCAL = 'http://localhost:3000'
const md = readFileSync('docs/DEMO-TOUR.md', 'utf8').replace(/\r\n/g, '\n')
const contents = readFileSync('docs/DEMO-TOUR-CONTENTS.md', 'utf8').replace(/\r\n/g, '\n')

// ---------- inline markdown ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function inline(src) {
  let s = esc(src)
  const codes = []
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    if (url.startsWith(LOCAL)) {
      const path = url.slice(LOCAL.length) || '/'
      const label = text.startsWith(LOCAL) ? `<span class="u-base"></span>${esc(text.slice(LOCAL.length)) || '/'}` : text
      return `<a class="applink" data-path="${path}" href="${LIVE}${path}" target="_blank" rel="noopener">${label}</a>`
    }
    if (url.startsWith('#')) return `<a href="${url}">${text}</a>`
    if (/^DEMO-TOUR(-CONTENTS)?\.md/.test(url)) return `<a href="#top">${text}</a>`
    return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
  })
  s = s.split(LOCAL).join('<span class="u-base"></span>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i].split(LOCAL).join('<span class="u-base"></span>')}</code>`)
  return s
}

// ---------- block markdown (paragraphs, ordered lists, tables) ----------
function blocks(lines) {
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim() === '---') { i++; continue }
    if (/^\|/.test(line)) {
      const rows = []
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++])
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(rows[0])
      const body = rows.slice(2).map(cells)
      out.push(`<div class="tablewrap"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body
        .map((r) => (r.slice(1).every((c) => !c) ? `<tr class="grouprow"><td colspan="${head.length}">${inline(r[0])}</td></tr>` : `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`))
        .join('')}</tbody></table></div>`)
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items = []
      const start = +line.match(/^(\d+)\./)[1]
      while (i < lines.length && (/^\d+\.\s/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]) || (!lines[i].trim() && /^\s{2,}\S/.test(lines[i + 1] ?? '')))) {
        if (/^\d+\.\s/.test(lines[i])) items.push([lines[i].replace(/^\d+\.\s+/, '')])
        else if (lines[i].trim()) items[items.length - 1].push(lines[i].trim())
        i++
      }
      out.push(`<ol class="steps" start="${start}" style="counter-reset: step ${start - 1}">${items
        .map(([first, ...rest]) => `<li><div>${inline(first)}${rest.map((r) => (/^`[^`]+`$/.test(r) ? `<div class="cmd"><code>${esc(r.slice(1, -1))}</code><button type="button" class="copy" data-copy="${esc(r.slice(1, -1)).replace(/"/g, '&quot;')}">Copy</button></div>` : `<p>${inline(r)}</p>`)).join('')}</div></li>`)
        .join('')}</ol>`)
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^\d+\.\s/.test(lines[i]) && !/^\|/.test(lines[i]) && lines[i].trim() !== '---') para.push(lines[i++])
    const text = para.join('\n')
    const m = text.match(/^\*\*([^*]+?):?\*\*:?\s*([\s\S]*)$/)
    if (m && /^Say$/i.test(m[1])) out.push(`<blockquote class="say"><span class="tag">Say</span><p>${inline(m[2])}</p></blockquote>`)
    else if (m && /^Do\b/i.test(m[1])) out.push(`<h4 class="do">${m[1].replace(/^Do:?\s*/i, '') ? `<span>Do</span> ${inline(m[1].replace(/^Do:?\s*/i, ''))}` : '<span>Do</span>'}</h4>${m[2] ? `<p>${inline(m[2])}</p>` : ''}`)
    else if (m && /^Clean up$/i.test(m[1])) out.push(`<div class="cleanup"><span class="tag">Clean up</span><p>${inline(m[2])}</p></div>`)
    else if (m && m[2].includes('\n') === false && para.length > 1) out.push(`<p>${inline(text.replace(/\n/g, ' '))}</p>`)
    else if (/^\*\*[^*]+\?\*\*\n/.test(text)) out.push(`<div class="qa"><h4>${inline(para[0].replace(/\*\*/g, ''))}</h4><p>${inline(para.slice(1).join(' '))}</p></div>`)
    else out.push(`<p>${inline(text.replace(/\n/g, ' '))}</p>`)
  }
  return out.join('\n')
}

// ---------- split the script into sections ----------
const parts = md.split(/\n(?=## )/)
const intro = parts.shift()
const groups = [] // from the contents file: [{name, numbers:[..], show:{n: text}}]
let g = null
for (const line of contents.split('\n')) {
  const h = line.match(/^## (.+)/)
  if (h) { g = { name: h[1], numbers: [] }; groups.push(g); continue }
  const r = line.match(/^\| (\d+) \|/)
  if (r && g) g.numbers.push(+r[1])
}
const shown = {}
for (const line of contents.split('\n')) {
  const r = line.match(/^\| (\d+) \|.*\|\s*([^|]+?)\s*\|\s*$/)
  if (r) shown[+r[1]] = r[2]
}
const shortSet = new Set((md.match(/Short version \(15 minutes\):\*\* sections ([^\n]+)/)?.[1].match(/\d+/g) ?? []).map(Number))

const sections = []
let before = ''
const appendices = []
for (const part of parts) {
  const [headLine, ...rest] = part.split('\n')
  const title = headLine.replace(/^## /, '').trim()
  const num = title.match(/^(\d+)\.\s+(.*)$/)
  if (num) {
    const body = rest.join('\n')
    const meta = body.match(/\*\*Time:\*\*\s*(\d+)\s*min\s*\|\s*\*\*Go to:\*\*\s*(.*)/)
    const goRaw = meta?.[2] ?? ''
    const link = goRaw.match(/\]\(([^)]+)\)/)?.[1] ?? null
    const lines = body.split('\n').filter((l) => !/^\*\*Time:\*\*/.test(l))
    sections.push({ n: +num[1], title: num[2], minutes: +(meta?.[1] ?? 0), path: link?.startsWith(LOCAL) ? link.slice(LOCAL.length) || '/' : null, goNote: link ? '' : goRaw, html: blocks(lines) })
  } else if (/^Before you start/i.test(title)) before = blocks(rest)
  else if (/^Appendix/i.test(title)) appendices.push({ id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), title, html: blocks(rest) })
}
const total = sections.reduce((s, x) => s + x.minutes, 0)
// The short version trims its sections (see the script), so use the stated length, not the sum.
const shortTotal = +(md.match(/Short version ((d+) minutes)/)?.[1] ?? 15)
const brand = (intro.match(/^# (.+)/m)?.[1] ?? 'Demo Tour').replace(/:.*$/, '')

// ---------- page ----------
const css = String.raw`
/* Layout: a fixed contents rail on the left, one reading column of numbered
   stops on the right; on phones the rail folds into a drawer above the column. */
:root {
  --canvas: #FAF6F3; --surface: #FFFFFF; --surface-2: #F5EDE9; --line: #EADCD8; --line-2: #D9C6C0;
  --ink: #26161A; --ink-2: #4A363C; --muted: #7A6368;
  --wine: #800020; --wine-deep: #4D0013; --wine-soft: #FBE4E9; --wine-on: #FFFFFF;
  --gold: #A5841D; --gold-soft: #FBF1D6; --ok: #1F7A4D; --ok-soft: #DDF3E6;
  --shadow: 0 1px 2px rgba(38,22,26,.05), 0 14px 34px -20px rgba(128,0,32,.28);
  --display: "Fraunces", ui-serif, Georgia, "Times New Roman", serif;
  --body: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace;
  --rail: 19.5rem;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --canvas: #140A0D; --surface: #1D1014; --surface-2: #26161B; --line: #34222A; --line-2: #4A323B;
  --ink: #F6EEEA; --ink-2: #DCCBCF; --muted: #A98F96;
  --wine: #C4274F; --wine-deep: #2A0A12; --wine-soft: #3A0E1A; --wine-on: #FFFFFF;
  --gold: #E3C565; --gold-soft: #33290F; --ok: #4CC38A; --ok-soft: #11301F;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 14px 34px -20px rgba(0,0,0,.7); color-scheme: dark } }
:root[data-theme="dark"] {
  --canvas: #140A0D; --surface: #1D1014; --surface-2: #26161B; --line: #34222A; --line-2: #4A323B;
  --ink: #F6EEEA; --ink-2: #DCCBCF; --muted: #A98F96;
  --wine: #C4274F; --wine-deep: #2A0A12; --wine-soft: #3A0E1A; --wine-on: #FFFFFF;
  --gold: #E3C565; --gold-soft: #33290F; --ok: #4CC38A; --ok-soft: #11301F;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 14px 34px -20px rgba(0,0,0,.7); color-scheme: dark }

* { box-sizing: border-box }
html { scroll-behavior: smooth; scroll-padding-top: 1rem }
body { margin: 0; background: var(--canvas); color: var(--ink); font: 400 1rem/1.6 var(--body); -webkit-font-smoothing: antialiased }
a { color: var(--wine); text-underline-offset: 3px }
strong { font-weight: 650; color: var(--ink) }
code { font: 0.86em var(--mono); background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px; padding: .1em .4em; overflow-wrap: anywhere }
h1, h2, h3 { font-family: var(--display); font-weight: 600; letter-spacing: -.01em; text-wrap: balance; margin: 0 }
button, input { font: inherit; color: inherit }
:focus-visible { outline: 3px solid color-mix(in srgb, var(--wine) 45%, transparent); outline-offset: 2px; border-radius: 8px }

.shell { display: grid; grid-template-columns: var(--rail) minmax(0, 1fr); min-height: 100vh }
.rail { position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto; border-right: 1px solid var(--line); background: var(--surface); padding: 1.25rem 1rem 2rem; display: flex; flex-direction: column; gap: 1rem }
.main { min-width: 0; padding-block: 2.25rem 5rem; padding-inline: clamp(1rem, 4vw, 3.5rem) }
.col { max-width: 50rem; margin-inline: auto; display: flex; flex-direction: column; gap: 1.5rem }

.brand { display: flex; align-items: center; gap: .6rem; font: 600 1.15rem var(--display) }
.brand svg { width: 2rem; height: 2rem; flex: none }
.label { font-size: .68rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--muted) }
.progress { display: flex; flex-direction: column; gap: .4rem }
.bar { height: .45rem; border-radius: 99px; background: var(--surface-2); overflow: hidden }
.bar i { display: block; height: 100%; width: 0; background: var(--wine); border-radius: 99px; transition: width .3s }
.progress small { color: var(--muted); font-size: .8rem; font-variant-numeric: tabular-nums }

.field { display: flex; flex-direction: column; gap: .3rem }
.field input { width: 100%; min-height: 2.5rem; border: 1px solid var(--line-2); border-radius: 10px; background: var(--canvas); padding: 0 .7rem; font-size: .85rem }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: .25rem; background: var(--surface-2); border-radius: 10px; padding: .25rem }
.seg button { border: 0; background: transparent; border-radius: 8px; min-height: 2.1rem; font-size: .8rem; font-weight: 600; color: var(--muted); cursor: pointer }
.seg button[aria-pressed="true"] { background: var(--wine); color: var(--wine-on) }
.quick { display: flex; gap: .35rem; flex-wrap: wrap }
.quick button { border: 1px solid var(--line-2); background: var(--surface); border-radius: 99px; padding: .2rem .65rem; font-size: .72rem; font-weight: 600; cursor: pointer; color: var(--ink-2) }

.toc { display: flex; flex-direction: column; gap: .9rem }
.toc ol { list-style: none; margin: .3rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 1px }
.toc a { display: grid; grid-template-columns: 1.6rem minmax(0, 1fr) auto; align-items: baseline; gap: .35rem; padding: .34rem .5rem; border-radius: 8px; text-decoration: none; color: var(--ink-2); font-size: .86rem; line-height: 1.3 }
.toc a:hover { background: var(--surface-2); color: var(--ink) }
.toc a.active { background: var(--wine-soft); color: var(--ink); font-weight: 600 }
.toc .n { font: 600 .78rem var(--display); color: var(--muted); font-variant-numeric: tabular-nums }
.toc .t { color: var(--muted); font-size: .72rem; font-variant-numeric: tabular-nums }
.toc li.done a { color: var(--muted) }
.toc li.done .n { color: var(--ok) }
.toc li.done .n::before { content: "✓ "; }
.toc li[hidden] { display: none }

.hero { background: var(--wine-deep); color: #F6EEEA; border-radius: 22px; padding: clamp(1.4rem, 4vw, 2.4rem); display: flex; flex-direction: column; gap: .9rem;
  background-image: radial-gradient(60rem 22rem at 0% 0%, rgba(227,197,101,.2), transparent 60%), radial-gradient(40rem 20rem at 100% 0%, rgba(196,39,79,.5), transparent 60%) }
.hero h1 { font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; color: #fff }
.hero p { margin: 0; color: rgba(246,238,234,.8); max-width: 38rem }
.hero .facts { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .3rem }
.hero .facts span { border: 1px solid rgba(255,255,255,.2); border-radius: 99px; padding: .25rem .8rem; font-size: .8rem; font-variant-numeric: tabular-nums; color: #fff }
.hero .facts b { color: #EBD68F; font-weight: 700 }

.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: clamp(1.1rem, 3vw, 1.75rem) }
.panel > h2 { font-size: 1.45rem; margin-bottom: .75rem }
.panel p { margin: .6rem 0; color: var(--ink-2); max-width: 65ch }

.grouphead { display: flex; align-items: baseline; gap: .8rem; margin-top: 1.25rem }
.grouphead h2 { font-size: 1.05rem; font-family: var(--body); font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--wine) }
.grouphead::after { content: ""; flex: 1; height: 1px; background: var(--line-2) }

.stop { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden }
.stop[hidden] { display: none }
.stop.done { box-shadow: none; opacity: .72 }
.stop header { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .25rem 1rem; padding: 1.15rem clamp(1rem, 3vw, 1.6rem) 1rem; border-bottom: 1px solid var(--line) }
.stop .num { grid-row: span 2; font: 600 2.6rem/1 var(--display); color: var(--wine); font-variant-numeric: tabular-nums; min-width: 2.6rem }
.stop h3 { font-size: 1.5rem; line-height: 1.15; align-self: end }
.stop .show { margin: 0; color: var(--muted); font-size: .92rem }
.meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .6rem }
.chip { display: inline-flex; align-items: center; gap: .35rem; border-radius: 99px; padding: .25rem .7rem; font-size: .78rem; font-weight: 600; background: var(--surface-2); color: var(--ink-2); font-variant-numeric: tabular-nums }
.chip.short { background: var(--gold-soft); color: var(--gold) }
.open { display: inline-flex; align-items: center; gap: .45rem; min-height: 2.5rem; padding: 0 1rem; border-radius: 12px; background: var(--wine); color: var(--wine-on); text-decoration: none; font-weight: 650; font-size: .88rem; max-width: 100%; min-width: 0 }
.open .p { font: .78rem var(--mono); opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.open:hover { filter: brightness(1.12) }
.gonote { font-size: .85rem; color: var(--ink-2) }
.donebox { margin-left: auto; display: inline-flex; align-items: center; gap: .45rem; font-size: .82rem; font-weight: 600; color: var(--ink-2); cursor: pointer; user-select: none }
.donebox input { width: 1.15rem; height: 1.15rem; accent-color: var(--ok) }

.body { padding: 1.1rem clamp(1rem, 3vw, 1.6rem) 1.4rem; display: flex; flex-direction: column; gap: 1rem }
.body > p { margin: 0; color: var(--ink-2); max-width: 65ch }
.tag { display: inline-block; font-size: .66rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase }
.say { margin: 0; background: var(--wine-soft); border-radius: 14px; padding: .85rem 1.1rem 1rem }
.say .tag { color: var(--wine) }
.say p { margin: .15rem 0 0; font: 400 1.16rem/1.5 var(--display); color: var(--ink); max-width: 60ch }
h4.do { margin: .2rem 0 -.3rem; font: 600 .95rem var(--body); color: var(--ink); display: flex; align-items: baseline; gap: .5rem; text-transform: none }
h4.do span { font-size: .66rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); background: var(--gold-soft); border-radius: 6px; padding: .15rem .45rem }
ol.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .55rem }
ol.steps > li { counter-increment: step; display: grid; grid-template-columns: 1.9rem minmax(0, 1fr); gap: .7rem; align-items: start; color: var(--ink-2) }
ol.steps > li::before { content: counter(step); display: grid; place-items: center; width: 1.9rem; height: 1.9rem; border-radius: 50%; border: 1.5px solid var(--line-2); font: 600 .82rem var(--display); color: var(--wine); font-variant-numeric: tabular-nums; background: var(--surface) }
ol.steps > li > div { padding-top: .12rem; max-width: 64ch }
ol.steps p { margin: .4rem 0 0 }
.cmd { display: flex; align-items: center; gap: .5rem; margin-top: .5rem; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: .45rem .5rem .45rem .75rem }
.cmd code { flex: 1; min-width: 0; background: none; border: 0; padding: 0; overflow-x: auto; white-space: nowrap }
.copy { border: 1px solid var(--line-2); background: var(--surface); border-radius: 8px; padding: .25rem .6rem; font-size: .75rem; font-weight: 600; cursor: pointer }
.cleanup { border: 1px dashed var(--line-2); border-radius: 12px; padding: .7rem 1rem .8rem }
.cleanup .tag { color: var(--muted) }
.cleanup p { margin: .15rem 0 0; font-size: .92rem; color: var(--ink-2); max-width: 65ch }

.tablewrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; margin-top: .5rem }
table { border-collapse: collapse; width: 100%; font-size: .9rem }
th, td { text-align: left; padding: .5rem .8rem; border-bottom: 1px solid var(--line); vertical-align: top }
th { font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); background: var(--surface-2) }
td:last-child { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--wine); font-weight: 600 }
tr:last-child td { border-bottom: 0 }
tr.grouprow td { background: var(--surface-2); color: var(--ink); font-weight: 700 }
.qa { border-top: 1px solid var(--line); padding-top: .9rem; margin-top: .9rem }
.qa:first-of-type { border-top: 0; padding-top: 0 }
.qa h4 { margin: 0; font: 600 1.08rem var(--display) }
.qa p { margin: .3rem 0 0 }
.empty { text-align: center; color: var(--muted); padding: 2rem 1rem }
.empty[hidden] { display: none }

.drawer { display: none }
@media (max-width: 62rem) {
  .shell { grid-template-columns: minmax(0, 1fr) }
  .rail { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); padding: .9rem 1rem }
  .rail .toc, .rail .controls { display: none }
  .rail.open .toc, .rail.open .controls { display: flex }
  .controls { flex-direction: column; gap: 1rem }
  .drawer { display: inline-flex; margin-left: auto; border: 1px solid var(--line-2); background: var(--surface); border-radius: 10px; min-height: 2.4rem; padding: 0 .9rem; font-weight: 600; font-size: .85rem; cursor: pointer }
  .brandrow { display: flex; align-items: center; gap: .6rem }
  .stop .num { font-size: 2rem; min-width: 2rem }
  .stop h3 { font-size: 1.25rem }
  .donebox { margin-left: 0 }
}
@media (min-width: 62.01rem) { .controls { display: flex; flex-direction: column; gap: 1rem } .brandrow { display: block } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } .bar i { transition: none } }
@media print { .rail, .donebox, .copy { display: none } .shell { display: block } .stop { break-inside: avoid; box-shadow: none } body { background: #fff } }
`

const logo = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="16" fill="#800020"/><path d="M18 36 L32 22 L46 36" fill="none" stroke="#E3C565" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="24" y="36" width="16" height="10" rx="2" fill="#FBF7F3"/><rect x="30" y="39" width="4" height="7" rx="1" fill="#800020"/></svg>`

const tocHtml = groups
  .map((gr) => {
    const items = sections.filter((s) => gr.numbers.includes(s.n))
    if (!items.length) return ''
    return `<div><div class="label">${esc(gr.name)}</div><ol>${items.map((s) => `<li data-n="${s.n}"><a href="#s${s.n}"><span class="n">${s.n}</span><span>${esc(s.title)}</span><span class="t">${s.minutes}m</span></a></li>`).join('')}</ol></div>`
  })
  .join('')

const stopsHtml = groups
  .map((gr) => {
    const items = sections.filter((s) => gr.numbers.includes(s.n))
    if (!items.length) return ''
    return `<div class="grouphead" data-group><h2>${esc(gr.name)}</h2></div>\n${items
      .map(
        (s) => `<article class="stop" id="s${s.n}" data-n="${s.n}" data-min="${s.minutes}" data-short="${shortSet.has(s.n) ? 1 : 0}">
<header>
  <div class="num">${s.n}</div>
  <h3>${esc(s.title)}</h3>
  <p class="show">${inline(shown[s.n] ?? '')}</p>
  <div class="meta">
    <span class="chip">${s.minutes} min</span>
    ${shortSet.has(s.n) ? '<span class="chip short">In the 15-minute version</span>' : ''}
    ${s.path ? `<a class="open applink" data-path="${s.path}" href="${LIVE}${s.path}" target="_blank" rel="noopener">Open screen <span class="p">${esc(s.path)}</span></a>` : `<span class="gonote">${inline(s.goNote)}</span>`}
    <label class="donebox" for="done${s.n}"><input type="checkbox" id="done${s.n}" data-done="${s.n}"> Done</label>
  </div>
</header>
<div class="body">${s.html}</div>
</article>`,
      )
      .join('\n')}`
  })
  .join('\n')

const page = `<title>${esc(brand)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;600;700;800&display=swap">
<style>${css}</style>
<div class="shell" id="top">
  <aside class="rail" id="rail">
    <div class="brandrow">
      <div class="brand">${logo}<span>${esc(brand)}</span></div>
      <button type="button" class="drawer" id="drawer" aria-expanded="false" aria-controls="rail">Contents</button>
    </div>
    <div class="controls">
      <div class="progress">
        <div class="label">Progress</div>
        <div class="bar"><i id="bar"></i></div>
        <small id="progress">0 of ${sections.length} done · ${total} min left</small>
      </div>
      <div class="field">
        <label class="label" for="base">Site address for the links</label>
        <input id="base" type="url" inputmode="url" spellcheck="false" value="${LIVE}" aria-describedby="basehint">
        <div class="quick" id="basehint"><button type="button" data-base="${LIVE}">Live site</button><button type="button" data-base="${LOCAL}">My computer</button></div>
      </div>
      <div class="field">
        <span class="label">Show</span>
        <div class="seg"><button type="button" id="all" aria-pressed="true">Full tour · ${total} min</button><button type="button" id="short" aria-pressed="false">Short · ${shortTotal} min</button></div>
      </div>
      <div class="field">
        <label class="label" for="q">Find a screen or button</label>
        <input id="q" type="search" placeholder="e.g. invoice, receipt, roles">
      </div>
    </div>
    <nav class="toc" aria-label="Contents">
      <div><ol><li><a href="#before"><span class="n">·</span><span>Before you start</span><span class="t"></span></a></li></ol></div>
      ${tocHtml}
      <div><div class="label">Reference</div><ol>${appendices.map((a) => `<li><a href="#${a.id}"><span class="n">·</span><span>${esc(a.title.replace(/^Appendix [A-Z]\.\s*/, ''))}</span><span class="t"></span></a></li>`).join('')}</ol></div>
    </nav>
  </aside>
  <main class="main"><div class="col">
    <section class="hero">
      <span class="label" style="color:#EBD68F">Presenter's script</span>
      <h1>${esc(brand)}</h1>
      <p>One continuous walk through the whole app. Each stop gives you the screen to open, what to say, and exactly what to click. Tick a stop when you finish it.</p>
      <div class="facts"><span><b>${sections.length}</b> stops</span><span><b>${total}</b> min full tour</span><span><b>${shortTotal}</b> min short version</span><span>Sign in as <b>admin@seaview.com</b></span></div>
    </section>
    <section class="panel" id="before"><h2>Before you start</h2>${before}</section>
    ${stopsHtml}
    <p class="empty" id="empty" hidden>No stop matches that search.</p>
    ${appendices.map((a) => `<section class="panel" id="${a.id}"><h2>${esc(a.title)}</h2>${a.html}</section>`).join('\n')}
  </div></main>
</div>
<script>
(function () {
  var KEY = 'demo-tour', state = { done: [], base: ${JSON.stringify(LIVE)}, short: false }
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) state = Object.assign(state, saved) } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch (e) {} }
  var $ = function (s, r) { return (r || document).querySelector(s) }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  var stops = $$('.stop'), total = stops.length

  function applyBase() {
    var b = (state.base || '').trim().replace(/\\/+$/, '')
    if (!/^https?:\\/\\//.test(b)) b = ${JSON.stringify(LIVE)}
    $$('.applink').forEach(function (a) { a.href = b + a.getAttribute('data-path') })
    $$('.u-base').forEach(function (s) { s.textContent = b })
  }
  function applyDone() {
    var left = 0, n = 0
    stops.forEach(function (st) {
      var id = +st.dataset.n, d = state.done.indexOf(id) >= 0, counted = !state.short || st.dataset.short === '1'
      st.classList.toggle('done', d)
      $('[data-done="' + id + '"]').checked = d
      var li = $('.toc li[data-n="' + id + '"]'); if (li) li.classList.toggle('done', d)
      if (counted) { if (d) n++; else left += +st.dataset.min }
    })
    var of = state.short ? stops.filter(function (s) { return s.dataset.short === '1' }).length : total
    $('#bar').style.width = (of ? (n / of) * 100 : 0) + '%'
    $('#progress').textContent = n + ' of ' + of + ' done' + (state.short ? ' · short version, trimmed stops' : ' · ' + left + ' min left')
  }
  function applyFilter() {
    var q = ($('#q').value || '').trim().toLowerCase(), shownCount = 0
    stops.forEach(function (st) {
      var ok = (!state.short || st.dataset.short === '1') && (!q || st.textContent.toLowerCase().indexOf(q) >= 0)
      st.hidden = !ok; if (ok) shownCount++
      var li = $('.toc li[data-n="' + st.dataset.n + '"]'); if (li) li.hidden = !ok
    })
    $$('[data-group]').forEach(function (h) {
      var el = h.nextElementSibling, any = false
      while (el && el.classList.contains('stop')) { if (!el.hidden) any = true; el = el.nextElementSibling }
      h.hidden = !any
    })
    $('#empty').hidden = shownCount > 0
    $('#all').setAttribute('aria-pressed', String(!state.short)); $('#short').setAttribute('aria-pressed', String(state.short))
    applyDone()
  }

  $('#base').value = state.base
  $('#base').addEventListener('input', function (e) { state.base = e.target.value; save(); applyBase() })
  $$('[data-base]').forEach(function (b) { b.addEventListener('click', function () { state.base = b.dataset.base; $('#base').value = state.base; save(); applyBase() }) })
  $('#all').addEventListener('click', function () { state.short = false; save(); applyFilter() })
  $('#short').addEventListener('click', function () { state.short = true; save(); applyFilter() })
  $('#q').addEventListener('input', applyFilter)
  $$('[data-done]').forEach(function (c) { c.addEventListener('change', function () {
    var id = +c.dataset.done, i = state.done.indexOf(id)
    if (c.checked && i < 0) state.done.push(id); if (!c.checked && i >= 0) state.done.splice(i, 1)
    save(); applyDone()
  }) })
  $$('.copy').forEach(function (b) { b.addEventListener('click', function () {
    var t = b.dataset.copy, done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy' }, 1500) }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { select(b) }); else select(b)
  }) })
  function select(b) { var r = document.createRange(); r.selectNodeContents(b.previousElementSibling); var s = getSelection(); s.removeAllRanges(); s.addRange(r) }
  $('#drawer').addEventListener('click', function () { var o = $('#rail').classList.toggle('open'); this.setAttribute('aria-expanded', String(o)) })
  $$('.toc a').forEach(function (a) { a.addEventListener('click', function () { $('#rail').classList.remove('open'); $('#drawer').setAttribute('aria-expanded', 'false') }) })
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { $$('.toc a.active').forEach(function (a) { a.classList.remove('active') }); var a = $('.toc a[href="#' + e.target.id + '"]'); if (a) { a.classList.add('active'); if (window.matchMedia('(min-width: 62.01rem)').matches) a.scrollIntoView({ block: 'nearest' }) } } }) }, { rootMargin: '-10% 0px -75% 0px' })
    stops.forEach(function (s) { io.observe(s) })
  }
  applyBase(); applyFilter()
})()
</script>
`

writeFileSync('docs/DEMO-TOUR.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}</body>\n</html>\n`)
if (process.argv[3]) writeFileSync(process.argv[3], page)
console.log(`docs/DEMO-TOUR.html written: ${sections.length} stops, ${total} min, short version ${shortTotal} min (${[...shortSet].join(', ')}), ${appendices.length} appendices`)
