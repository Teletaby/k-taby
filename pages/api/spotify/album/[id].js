import fs from 'fs'
import path from 'path'
import { getAlbum, normalizeSpotifyId } from '../../../../lib/spotify'

const CACHE_PATH = path.resolve(process.cwd(), 'data', 'spotify_album_cache.json')

function readCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return {}
    const raw = fs.readFileSync(CACHE_PATH, 'utf8')
    return JSON.parse(raw || '{}')
  } catch (e) {
    console.error('failed to read spotify album cache', e.message)
    return {}
  }
}

function writeCache(obj) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj, null, 2), 'utf8')
  } catch (e) {
    console.error('failed to write spotify album cache', e.message)
  }
}

export default async function handler(req, res) {
  try {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'album id required' })

    const normalized = normalizeSpotifyId(id)
    if (!normalized || !/^[A-Za-z0-9]+$/.test(normalized)) {
      console.error('spotify api invalid id', { raw: id, normalized })
      return res.status(400).json({ error: 'invalid album id', id, normalized })
    }

    // Check file cache first
    const cache = readCache()
    if (cache[normalized]) {
      return res.status(200).json(cache[normalized])
    }

    const album = await getAlbum(normalized)

    // Persist to cache for future requests
    try {
      cache[normalized] = { ...(album || {}), _cachedAt: Date.now() }
      writeCache(cache)
    } catch (e) {
      console.error('failed to persist album to cache', e.message)
    }

    return res.status(200).json(album)
  } catch (e) {
    console.error('spotify api error', { message: e.message, rawId: req.query.id })
    const status = e.status || 500
    return res.status(status).json({ error: e.message })
  }
}
