import fs from 'fs'
import path from 'path'

function isAdminFromReq(req) {
  const c = req.headers.cookie || ''
  const cookieOk = c.split(/;\s*/).some(x => x.trim() === 'ktaby_admin=1')
  // also allow a secret token via header for CI or webhooks
  const tokenHeader = (req.headers['x-admin-token'] || req.headers['authorization'] || '')
  const token = String(tokenHeader || '').replace(/^Bearer\s+/i, '')
  const secret = process.env.TABBY_ADMIN_TOKEN || ''
  const tokenOk = secret && token && token === secret
  return cookieOk || tokenOk
}

const DATA_PATH = path.resolve(process.cwd(), 'data', 'tiktok_tabby_edits.json')
const OEMBED_CACHE_PATH = path.resolve(process.cwd(), 'data', 'tiktok_oembed_cache.json')
const FETCH_CACHE_PATH = path.resolve(process.cwd(), 'data', 'tiktok_fetch_cache.json')

function backupFile(filePath) {
  try {
    const bak = `${filePath}.bak.${Date.now()}`
    fs.copyFileSync(filePath, bak)
  } catch (e) {}
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchWithRetry(url, opts = {}, attempts = 3) {
  let lastErr = null
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { 'User-Agent': 'k-taby/1.0 (+https://k-taby.local)', ...(opts.headers || {}) } })
      if (!r.ok) {
        lastErr = new Error(`status ${r.status}`)
        // 429 -> wait longer
        const wait = r.status === 429 ? 1500 * (i + 1) : 500 * (i + 1)
        await sleep(wait)
        continue
      }
      return r
    } catch (e) {
      lastErr = e
      await sleep(500 * (i + 1))
    }
  }
  throw lastErr
}

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch (e) { return fallback }
}
function writeJson(filePath, obj) {
  try { fs.writeFileSync(filePath, JSON.stringify(obj, null, 2)) } catch (e) {}
}

async function fetchPageHtml(baseUrl) {
  // Try a few URL variants and browser UA strings to coax content back from TikTok
  const candidates = [
    `${baseUrl}`,
    `${baseUrl}?lang=en`,
    `${baseUrl}?lang=en&is_copy_url=1`,
    `${baseUrl}&lang=en&is_copy_url=1`
  ]
  const ualist = [
    // common Chrome UA
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Mobile UA
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
  ]

  const cache = readJson(FETCH_CACHE_PATH, {})
  const now = Date.now()

  for (const url of candidates) {
    const entry = cache[url]
    if (entry && (now - (entry.ts || 0) < 60 * 1000) && entry.html) return entry.html // 1 minute cache
    for (const ua of ualist) {
      try {
        const r = await fetchWithRetry(url, { headers: { 'User-Agent': ua } }, 3)
        if (!r) continue
        const html = await r.text()
        if (!html) continue
        cache[url] = { ts: now, html }
        writeJson(FETCH_CACHE_PATH, cache)
        return html
      } catch (e) {
        // try next
      }
      // short pause between tries
      await sleep(300)
    }
  }

  // If we reached here and ALLOW_HEADLESS is enabled, attempt a headless render as a fallback
  if (String(process.env.ALLOW_HEADLESS).toLowerCase() === 'true') {
    try {
      const ids = await fetchVideoIdsWithHeadless(baseUrl)
      // if headless produced an HTML-like structure, synthesize minimal HTML with links
      if (ids && ids.length) {
        const html = ids.map(id => `<a href="${baseUrl.replace(/\/$/, '')}/video/${id}">video</a>`).join('\n')
        cache[baseUrl] = { ts: now, html }
        writeJson(FETCH_CACHE_PATH, cache)
        return html
      }
    } catch (e) {
      // ignore
    }
  }

  return null
}

// headless fallback using Puppeteer (optional, gated by ALLOW_HEADLESS)
async function fetchVideoIdsWithHeadless(baseUrl) {
  // lazy-load puppeteer to avoid requiring it when not used
  let puppeteer
  try { puppeteer = require('puppeteer') } catch (e) { return [] }

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox','--disable-blink-features=AutomationControlled'], headless: 'new' })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1200, height: 800 })
    page.setDefaultNavigationTimeout(30000)
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://www.tiktok.com/' })

    // basic stealth: overwrite webdriver and other fingerprinting surfaces
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
      Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3] })
      window.chrome = { runtime: {} }
    })

    const url = `${baseUrl}?lang=en`
    await page.goto(url, { waitUntil: 'networkidle2' })

    // small random mouse movement to appear human
    try {
      const box = { x: 100, y: 200 }
      await page.mouse.move(box.x, box.y, { steps: 6 })
      await sleep(100)
      await page.mouse.move(box.x+50, box.y+10, { steps: 4 })
    } catch(e) {}

    // try to scroll a few times to load content
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      await sleep(600)
    }

    // First try anchors
    const hrefs = await page.$$eval('a[href*="/video/"]', as => as.map(a => a.href))
    let ids = Array.from(new Set(hrefs.map(h => { const m = h.match(/\/video\/(\d+)/); return m ? m[1] : null }).filter(Boolean))).slice(0, 50)
    if (ids && ids.length) {
      await page.close()
      return ids
    }

    // If anchors not present, look for JSON blobs in script tags (many TikTok pages embed initial data)
    const scriptTexts = await page.$$eval('script[type="application/json"], script', ss => ss.map(s => s.textContent || '').filter(Boolean))
    const found = new Set()
    function collectIdsFromObject(obj) {
      const out = []
      const seen = new Set()
      function rec(x) {
        if (!x) return
        if (typeof x === 'string') {
          const m = x.match(/(\d{9,25})/g)
          if (m) for (const mm of m) { if (!seen.has(mm)) { seen.add(mm); out.push(mm) } }
          return
        }
        if (Array.isArray(x)) return x.forEach(rec)
        if (typeof x === 'object') {
          // check for direct video-like objects
          if ((x.id || x.aweme_id || x.video_id || x.awemeId) && (String(x.id || x.aweme_id || x.video_id || x.awemeId).match(/^\d{6,25}$/))) {
            const cand = String(x.id || x.aweme_id || x.video_id || x.awemeId)
            if (!seen.has(cand)) { seen.add(cand); out.push(cand) }
          }
          // also check nested 'itemList' or 'aweme' arrays
          for (const k of Object.keys(x)) {
            const v = x[k]
            if (k.toLowerCase().includes('item') && Array.isArray(v)) {
              v.forEach(rec)
            } else {
              rec(v)
            }
          }
        }
      }
      rec(obj)
      return out
    }

    for (const txt of scriptTexts) {
      try {
        const j = JSON.parse(txt)
        const idsFromJson = collectIdsFromObject(j)
        for (const id of idsFromJson) found.add(id)
      } catch (e) {
        // not JSON — try to find ids via regex
        const re = /\/video\/(\d{9,25})/g
        let m
        while ((m = re.exec(txt)) !== null) found.add(m[1])
      }
    }

    ids = Array.from(found).slice(0, 50)
    await page.close()
    return ids
  } finally {
    try { await browser.close() } catch(e){}
  }
}

function extractVideoIdsFromHtml(html) {
  // look for /@user/video/123456 or /video/123456; also try to find numeric ids in common JSON blobs
  const ids = new Set()
  if (!html) return []
  const re = /\/video\/(\d+)/g
  let m
  while ((m = re.exec(html)) !== null) ids.add(m[1])

  // try to find "video_id": "123456..." occurrences
  const re2 = /"video_id"\s*[:=]\s*"?(\d{6,})"?/g
  while ((m = re2.exec(html)) !== null) ids.add(m[1])

  return Array.from(ids)
}

async function fetchOEmbedWithCache(url) {
  const cache = readJson(OEMBED_CACHE_PATH, {})
  const now = Date.now()
  const cached = cache[url]
  if (cached && (now - (cached.ts || 0) < 24 * 60 * 60 * 1000)) return cached.value // 24h cache

  try {
    const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const r = await fetchWithRetry(oembed, {}, 2)
    if (!r.ok) return null
    const j = await r.json()
    cache[url] = { ts: now, value: j }
    writeJson(OEMBED_CACHE_PATH, cache)
    // polite delay between oEmbed requests
    await sleep(250)
    return j
  } catch (e) {
    return null
  }
}

export default async function handler(req, res) {
  if (!isAdminFromReq(req)) return res.status(403).json({ error: 'admin required' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const { user, tag, limit } = req.query
  const max = Math.min(50, Math.max(1, parseInt(limit || '20')))

  let found = []
  if (user) {
    const url = `https://www.tiktok.com/@${user}`
    const html = await fetchPageHtml(url)
    const ids = extractVideoIdsFromHtml(html).slice(0, max)
    found = ids.map(id => `https://www.tiktok.com/@${user}/video/${id}`)
  } else if (tag) {
    const url = `https://www.tiktok.com/tag/${tag}`
    const html = await fetchPageHtml(url)
    const ids = extractVideoIdsFromHtml(html).slice(0, max)
    found = ids.map(id => `https://www.tiktok.com/video/${id}`)
  } else {
    return res.status(400).json({ error: 'specify user or tag' })
  }

  // dedupe
  found = Array.from(new Set(found)).slice(0, max)

  let items = []
  try { items = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) } catch (e) { items = [] }
  const existingByUrl = new Set(items.map(i => i.url))
  const existingByVideo = new Set(items.map(i => i.videoId))

  const added = []
  for (const url of found) {
    if (existingByUrl.has(url)) continue
    // try cached oembed first
    const o = await fetchOEmbedWithCache(url)
    const caption = (o && (o.title || o.author_name)) || ''
    const thumb = (o && o.thumbnail_url) || `https://via.placeholder.com/480x640?text=tiktok`
    const vidMatch = String(url).match(/\/video\/(\d+)/)
    const videoId = vidMatch ? vidMatch[1] : null
    if (videoId && existingByVideo.has(videoId)) continue
    const id = videoId ? `t${videoId}` : `t${Date.now()}${Math.random().toString(36).slice(2,5)}`
    const hashtags = (caption.match(/#([a-z0-9_-]+)/ig) || []).map(s => s.replace(/^#/, '').toLowerCase())
    const item = { id, url, videoId, caption, hashtags, created_at: new Date().toISOString(), thumbnail: thumb }
    items.push(item)
    added.push(item)
    existingByUrl.add(url)
    if (videoId) existingByVideo.add(videoId)
  }

  if (added.length > 0) {
    try { backupFile(DATA_PATH); fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2)) } catch (e) { return res.status(500).json({ error: 'failed to write data' }) }
  }

  res.json({ ok: true, found: found.length, added: added.length, addedItems: added })
}