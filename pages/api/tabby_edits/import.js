import fs from 'fs'
import path from 'path'

function isAdminFromReq(req) {
  const c = req.headers.cookie || ''
  const cookieOk = c.split(/;\s*/).some(x => x.trim() === 'ktaby_admin=1')
  // also allow a secret token via header for automation
  const tokenHeader = (req.headers['x-admin-token'] || req.headers['authorization'] || '')
  const token = String(tokenHeader || '').replace(/^Bearer\s+/i, '')
  const secret = process.env.TABBY_ADMIN_TOKEN || ''
  const tokenOk = secret && token && token === secret
  return cookieOk || tokenOk
}

const DATA_PATH = path.resolve(process.cwd(), 'data', 'tiktok_tabby_edits.json')

function backupFile(filePath) {
  try {
    const bak = `${filePath}.bak.${Date.now()}`
    fs.copyFileSync(filePath, bak)
  } catch (e) {}
}

async function fetchOEmbed(url) {
  const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
  try {
    const r = await fetch(oembed, { headers: { 'User-Agent': 'k-taby/1.0' } })
    if (!r.ok) return null
    const j = await r.json()
    return j
  } catch (e) {
    return null
  }
}

function extractVideoId(url) {
  try {
    const m = String(url).match(/\/video\/(\d+)/)
    if (m) return m[1]
    return null
  } catch(e){return null}
}

function extractHashtagsFromText(text) {
  if (!text) return []
  const tags = Array.from(new Set((String(text).match(/#([a-z0-9_-]+)/ig) || []).map(s => s.replace(/^#/, '').toLowerCase())))
  return tags
}

export default async function handler(req, res) {
  if (!isAdminFromReq(req)) return res.status(403).json({ error: 'admin required' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { urls } = req.body
  if (!urls || !Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'no urls' })

  let items = []
  try { items = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) } catch (e) { items = [] }

  const existingByUrl = new Set(items.map(i => i.url))
  const existingByVideo = new Set(items.map(i => i.videoId))

  const added = []

  for (const urlRaw of urls) {
    const url = String(urlRaw).trim()
    if (!url) continue
    if (existingByUrl.has(url)) continue
    const videoId = extractVideoId(url)
    if (videoId && existingByVideo.has(videoId)) continue

    // try oembed
    const o = await fetchOEmbed(url)
    const caption = (o && (o.title || o.author_name)) || ''
    const thumb = (o && o.thumbnail_url) || `https://via.placeholder.com/480x640?text=tiktok` 
    const hashtags = extractHashtagsFromText(caption)

    const id = videoId ? `t${videoId}` : `t${Date.now()}${Math.random().toString(36).slice(2,5)}`
    const item = {
      id,
      url,
      videoId: videoId || null,
      caption: caption || '',
      hashtags,
      created_at: new Date().toISOString(),
      thumbnail: thumb
    }

    items.push(item)
    existingByUrl.add(url)
    if (videoId) existingByVideo.add(videoId)
    added.push(item)
  }

  // persist
  try {
    backupFile(DATA_PATH)
    fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2))
  } catch (e) {
    return res.status(500).json({ error: 'failed to write data' })
  }

  res.json({ ok: true, added, count: added.length })
}