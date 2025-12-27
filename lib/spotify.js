const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

const TOKEN_CACHE = path.resolve(process.cwd(), 'data', 'spotify_token_cache.json')

function readTokenCache() {
  try {
    if (!fs.existsSync(TOKEN_CACHE)) return null
    return JSON.parse(fs.readFileSync(TOKEN_CACHE, 'utf8') || 'null')
  } catch (e) {
    return null
  }
}

function writeTokenCache(obj) {
  try { fs.writeFileSync(TOKEN_CACHE, JSON.stringify(obj || {}), 'utf8') } catch (e) { /* noop */ }
}

async function getClientToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required')

  const cached = readTokenCache()
  if (cached && cached.access_token && Date.now() < (cached.expires_at || 0) - 5000) return cached.access_token

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`spotify token fetch failed: ${res.status} ${text}`)
  }
  const j = await res.json()
  const expiresAt = Date.now() + (j.expires_in || 3600) * 1000
  writeTokenCache({ access_token: j.access_token, expires_at: expiresAt })
  return j.access_token
}

async function fetchSpotify(pathname) {
  const token = await getClientToken()
  const url = `https://api.spotify.com/v1/${pathname}`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    const err = new Error(`spotify api ${r.status}: ${text}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

function normalizeSpotifyId(id) {
  if (!id) return id
  // full URL like https://open.spotify.com/album/ID (may include query string)
  try {
    if (/^https?:\/\//i.test(id)) {
      const url = new URL(id)
      const parts = url.pathname.split('/').filter(Boolean)
      let last = parts[parts.length - 1] || ''
      if (last.includes('?')) last = last.split('?')[0]
      return last
    }
  } catch (e) { /* fall through */ }

  // spotify URI: spotify:album:ID
  if (id.includes(':')) {
    const parts = id.split(':')
    return parts[parts.length - 1]
  }

  // strip query params like ID?si=...
  if (id.includes('?')) return id.split('?')[0]

  return id
}

async function getAlbum(id) {
  if (!id) throw new Error('album id required')
  const normalized = normalizeSpotifyId(id)
  if (!normalized || !/^[A-Za-z0-9]+$/.test(normalized)) throw new Error('invalid album id')
  // fetch album and tracks
  const j = await fetchSpotify(`albums/${encodeURIComponent(normalized)}`)
  // normalize: include preview_url per track
  return {
    id: j.id,
    name: j.name,
    artists: j.artists,
    images: j.images,
    release_date: j.release_date,
    release_date_precision: j.release_date_precision,
    tracks: j.tracks.items.map(t => ({
      id: t.id,
      name: t.name,
      duration_ms: t.duration_ms,
      preview_url: t.preview_url,
      track_number: t.track_number
    }))
  }
}

module.exports = { getClientToken, getAlbum, fetchSpotify, normalizeSpotifyId }
