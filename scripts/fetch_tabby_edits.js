const fs = require('fs')
const path = require('path')
const DATA_PATH = path.resolve(process.cwd(), 'data', 'tiktok_tabby_edits.json')
const OEMBED_CACHE_PATH = path.resolve(process.cwd(), 'data', 'tiktok_oembed_cache.json')
const FETCH_CACHE_PATH = path.resolve(process.cwd(), 'data', 'tiktok_fetch_cache.json')

function backup(file) {
  try { fs.copyFileSync(file, `${file}.bak.${Date.now()}`) } catch(e){}
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'k-taby/1.0 (+https://k-taby.local)' } })
      if (r.ok) return r
      // backoff on 429
      await sleep((r.status === 429 ? 1000 : 300) * (i + 1))
    } catch (e) { await sleep(300 * (i + 1)) }
  }
  return null
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')) } catch(e) { return fallback }
}
function writeJson(file, obj) { try { fs.writeFileSync(file, JSON.stringify(obj, null, 2)) } catch(e){} }

async function fetchPageHtml(baseUrl) {
  const candidates = [
    `${baseUrl}`,
    `${baseUrl}?lang=en`,
    `${baseUrl}?lang=en&is_copy_url=1`,
    `${baseUrl}&lang=en&is_copy_url=1`
  ]
  const ualist = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
  ]

  const cache = readJson(FETCH_CACHE_PATH, {})
  const now = Date.now()

  for (const url of candidates) {
    const entry = cache[url]
    if (entry && (now - (entry.ts || 0) < 60 * 1000) && entry.html) return entry.html
    for (const ua of ualist) {
      const r = await fetchWithRetry(url, 3)
      if (!r) continue
      const html = await r.text()
      if (!html) continue
      cache[url] = { ts: now, html }
      writeJson(FETCH_CACHE_PATH, cache)
      await sleep(300)
      return html
    }
  }

  // headless fallback if allowed
  if (String(process.env.ALLOW_HEADLESS).toLowerCase() === 'true') {
    try {
      const ids = await fetchVideoIdsWithHeadless(baseUrl)
      if (ids && ids.length) {
        const html = ids.map(id => `<a href="${baseUrl.replace(/\/$/, '')}/video/${id}">video</a>`).join('\n')
        cache[baseUrl] = { ts: now, html }
        writeJson(FETCH_CACHE_PATH, cache)
        return html
      }
    } catch (e) {}
  }

  return null
}

async function fetchVideoIdsWithHeadless(baseUrl) {
  let puppeteer
  try { puppeteer = require('puppeteer') } catch (e) { return [] }

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox','--disable-blink-features=AutomationControlled'], headless: 'new' })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1200, height: 800 })
    page.setDefaultNavigationTimeout(30000)
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://www.tiktok.com/' })

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
      Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3] })
      window.chrome = { runtime: {} }
    })

    const url = `${baseUrl}?lang=en`
    await page.goto(url, { waitUntil: 'networkidle2' })

    try {
      const box = { x: 100, y: 200 }
      await page.mouse.move(box.x, box.y, { steps: 6 })
      await sleep(100)
      await page.mouse.move(box.x+50, box.y+10, { steps: 4 })
    } catch(e) {}

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
          if ((x.id || x.aweme_id || x.video_id || x.awemeId) && (String(x.id || x.aweme_id || x.video_id || x.awemeId).match(/^\d{6,25}$/))) {
            const cand = String(x.id || x.aweme_id || x.video_id || x.awemeId)
            if (!seen.has(cand)) { seen.add(cand); out.push(cand) }
          }
          for (const k of Object.keys(x)) {
            const v = x[k]
            if (k.toLowerCase().includes('item') && Array.isArray(v)) v.forEach(rec)
            else rec(v)
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
  const ids = new Set()
  if (!html) return []
  const re = /\/video\/(\d+)/g
  let m
  while ((m = re.exec(html)) !== null) ids.add(m[1])
  const re2 = /"video_id"\s*[:=]\s*"?(\d{6,})"?/g
  while ((m = re2.exec(html)) !== null) ids.add(m[1])
  return Array.from(ids)
}

async function fetchOEmbedWithCache(url) {
  const cache = readJson(OEMBED_CACHE_PATH, {})
  const now = Date.now()
  const cached = cache[url]
  if (cached && (now - (cached.ts || 0) < 24 * 60 * 60 * 1000)) return cached.value
  const r = await fetchWithRetry(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, 2)
  if (!r) return null
  const j = await r.json()
  cache[url] = { ts: now, value: j }
  writeJson(OEMBED_CACHE_PATH, cache)
  await sleep(250)
  return j
}

async function main() {
  console.log('Fetching @tabby_edits...')
  const html = await fetchPageHtml('https://www.tiktok.com/@tabby_edits')
  if (!html) { console.error('failed to fetch user page'); process.exit(1) }
  const ids = extractVideoIdsFromHtml(html).slice(0, 20)
  console.log('found ids', ids.slice(0,6))
  let items = []
  for (const id of ids) {
    const url = `https://www.tiktok.com/@tabby_edits/video/${id}`
    const o = await fetchOEmbedWithCache(url)
    const caption = (o && (o.title || ''))
    const thumb = (o && o.thumbnail_url) || `https://via.placeholder.com/480x640?text=tiktok`
    const hashtags = (caption.match(/#([a-z0-9_-]+)/ig) || []).map(s=>s.replace(/^#/,'').toLowerCase())
    items.push({ id: `t${id}`, url, videoId: id, caption, hashtags, created_at: new Date().toISOString(), thumbnail: thumb })
  }

  // merge with existing file, dedupe by videoId
  let existing = []
  try { existing = JSON.parse(fs.readFileSync(DATA_PATH,'utf8')) } catch(e){ existing = [] }
  const byVideo = new Map(existing.map(i=>[i.videoId,i]))
  for (const it of items) if (it.videoId && !byVideo.has(it.videoId)) byVideo.set(it.videoId, it)
  const out = Array.from(byVideo.values()).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))

  backup(DATA_PATH)
  fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2))
  console.log('saved', out.length, 'items to', DATA_PATH)
}

main().catch(e=>{ console.error(e); process.exit(1) })