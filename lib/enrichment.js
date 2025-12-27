import fs from 'fs'
import path from 'path'
import { getArtistEnrichment as mbEnrich } from './musicbrainz'

const CACHE_FILE = path.resolve(process.cwd(), 'data', 'enrichment_cache.json')
const THEAUDIODB_KEY = process.env.THEAUDIODB_KEY || '123'
const THEAUDIODB_BASE = 'https://www.theaudiodb.com/api/v1/json'

function readFileCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    const raw = fs.readFileSync(CACHE_FILE, 'utf8')
    return JSON.parse(raw || '{}')
  } catch (err) {
    return {}
  }
}

function writeFileCache(obj) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (err) {
    console.error('writeFileCache failed', err)
  }
}

// Simple cache interface that prefers Redis if REDIS_URL set, else file
let redisClient = null
async function tryInitRedis() {
  if (redisClient || !process.env.REDIS_URL) return
  try {
    // use runtime require to avoid bundler trying to resolve 'redis' at build time
    const createClient = eval("require")('redis').createClient
    redisClient = createClient({ url: process.env.REDIS_URL })
    redisClient.on('error', (err) => console.error('Redis error', err))
    await redisClient.connect()
    console.log('Redis connected')
  } catch (err) {
    console.warn('Redis not available, falling back to file cache')
    redisClient = null
  }
}

async function cacheGet(key) {
  await tryInitRedis()
  if (redisClient) {
    try {
      const v = await redisClient.get(key)
      return v ? JSON.parse(v) : null
    } catch (err) {
      console.error('redis get failed', err)
      return null
    }
  }
  const obj = readFileCache()
  return obj[key] || null
}

async function cacheSet(key, value) {
  await tryInitRedis()
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value))
      return
    } catch (err) {
      console.error('redis set failed', err)
    }
  }
  const obj = readFileCache()
  obj[key] = value
  writeFileCache(obj)
}

async function fetchFromTheAudioDB(artistName) {
  try {
    const q = `${THEAUDIODB_BASE}/${THEAUDIODB_KEY}/search.php?s=${encodeURIComponent(artistName)}`
    const r = await fetch(q)
    if (!r.ok) return null
    const j = await r.json()
    const artist = j && j.artists && j.artists[0]
    const out = { albums: [], songs: [], description: null, image: null, urls: [] }
    if (!artist) return null

    out.description = artist.strBiographyEN || artist.strBiography || null
    out.image = artist.strArtistThumb || artist.strArtistLogo || null

    // fetch discography
    const discQ = `${THEAUDIODB_BASE}/${THEAUDIODB_KEY}/discography.php?s=${encodeURIComponent(artistName)}`
    const dr = await fetch(discQ)
    if (dr.ok) {
      const dj = await dr.json()
      const albums = dj && dj.album ? dj.album : []
      out.albums = albums.map(a => ({ title: a.strAlbum, id: a.idAlbum, first_release_date: a.intYearReleased || null }))

      // fetch tracks for each album (limited to first 6)
      const MAX = 6
      const songs = []
      for (let i = 0; i < Math.min(albums.length, MAX); i++) {
        const a = albums[i]
        if (!a.idAlbum) continue
        const tQ = `${THEAUDIODB_BASE}/${THEAUDIODB_KEY}/track.php?m=${a.idAlbum}`
        try {
          const tr = await fetch(tQ)
          if (!tr.ok) continue
          const tj = await tr.json()
          const tracks = tj && tj.track ? tj.track : []
          for (const t of tracks) if (t.strTrack) songs.push(t.strTrack)
          // throttle a bit to be safe with rate limit
          await new Promise(r => setTimeout(r, 2000))
        } catch (err) {
          continue
        }
      }
      out.songs = Array.from(new Set(songs))
    }

    // add some urls
    if (artist && (artist.strWebsite || artist.strFacebook || artist.strTwitter || artist.strLastFMChart)) {
      const urls = []
      if (artist.strWebsite) urls.push(artist.strWebsite)
      if (artist.strFacebook) urls.push(artist.strFacebook)
      if (artist.strTwitter) urls.push(artist.strTwitter)
      out.urls = urls
    }

    return out
  } catch (err) {
    console.error('TheAudioDB fetch failed', err)
    return null
  }
}

export async function getEnrichment(artistName, options = {}) {
  if (!artistName) return null
  const key = options && options.mbid ? `enrich:mbid:${options.mbid}` : `enrich:${artistName.toLowerCase()}`
  const cached = await cacheGet(key)
  const TTL = (typeof options.ttl === 'number') ? options.ttl : (1000 * 60 * 60 * 24) // default 24 hours
  if (cached && (Date.now() - (cached.lastUpdated || 0)) < TTL) return cached.payload

  // Try TheAudioDB first
  let a = null
  try {
    a = await fetchFromTheAudioDB(artistName)
  } catch (err) {
    console.error('TheAudioDB fetch error', err)
  }

  if (a && (a.albums && a.albums.length || a.songs && a.songs.length || a.description)) {
    // If TheAudioDB has albums but not songs, try MusicBrainz for track lists and additional albums.
    let merged = { ...a }
    let source = 'theaudiodb'
    if ((!merged.songs || merged.songs.length === 0)) {
      try {
        const mbOptions = { fetchTracks: true, maxReleaseGroups: 30, delayMs: 1100 }
        if (options && options.country) mbOptions.country = options.country
        if (options && options.mbid) mbOptions.mbid = options.mbid
        const mb = await mbEnrich(artistName, mbOptions)
        if (mb) {
          // merge songs
          merged.songs = Array.from(new Set([...(merged.songs || []), ...(mb.songs || [])]))
          // merge albums by id when available, else by normalized title
          const albumMap = new Map()
          ;[...(merged.albums || []), ...(mb.albums || [])].forEach(a => {
            if (!a) return
            const key = a.id || (a.title && a.title.toLowerCase())
            if (!key) return
            if (!albumMap.has(key)) albumMap.set(key, a)
          })
          merged.albums = Array.from(albumMap.values())
          merged.urls = Array.from(new Set([...(merged.urls || []), ...(mb.urls || [])]))
          merged.description = merged.description || mb.description
          merged.image = merged.image || mb.image
          source = 'theaudiodb+musicbrainz'
        }
      } catch (err) {
        console.warn('MusicBrainz merge failed', err)
      }
    }
    const payload = { ...merged, source, lastUpdated: Date.now() }
    await cacheSet(key, { payload, lastUpdated: Date.now() })
    return payload
  }

  // fallback to MusicBrainz (allow passing country hint)
  const mbOptions = { fetchTracks: true, maxReleaseGroups: 30, delayMs: 1100 }
  if (options && options.country) mbOptions.country = options.country
  if (options && options.mbid) mbOptions.mbid = options.mbid

  let mb = null
  try {
    mb = await mbEnrich(artistName, mbOptions)
  } catch (err) {
    console.error('MusicBrainz fetch error', err)
  }

  if (mb) {
    const payload = { ...mb, source: 'musicbrainz', lastUpdated: Date.now() }
    await cacheSet(key, { payload, lastUpdated: Date.now() })
    return payload
  }

  // nothing found, cache a short negative result to avoid hammering APIs
  await cacheSet(key, { payload: null, lastUpdated: Date.now() })
  return null
}

export async function refreshEnrichment(artistName, options = {}) {
  const key = `enrich:${artistName.toLowerCase()}`
  const payload = await getEnrichment(artistName, { ttl: 0, ...options })
  return payload
}
