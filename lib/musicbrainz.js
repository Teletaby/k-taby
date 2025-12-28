const MB_BASE = 'https://musicbrainz.org/ws/2'
const uaDefault = 'k-taby/1.0 (contact: your-email@example.com)'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Simple shared in-memory cache across server runtime
if (!global.__mb_helper_cache) global.__mb_helper_cache = new Map()

export async function getArtistEnrichment(name, options = {}) {
  const { userAgent = uaDefault, fetchTracks = true, maxReleaseGroups = 30, delayMs = 1100, country = null } = options
  if (!name && !options.mbid) return null

  const cacheKey = `artist:${options.mbid ? options.mbid : name.toLowerCase()}`
  const cached = global.__mb_helper_cache.get(cacheKey)
  const CACHE_TTL = 1000 * 60 * 60 // 1 hour
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) return cached.payload

  try {
    // If an explicit MBID is provided, fetch the artist directly; otherwise search by name
    let artist = null
    let lj = null
    if (options.mbid) {
      const lookupUrl = `${MB_BASE}/artist/${options.mbid}?inc=url-rels+release-groups&fmt=json`
      const l = await fetch(lookupUrl, { headers: { 'User-Agent': userAgent } })
      if (!l || !l.ok) return null
      lj = await l.json()
      artist = { id: lj.id, name: lj.name, disambiguation: lj.disambiguation, country: lj.country }
    } else {
      // search artist (fetch multiple results and pick the best match)
      let query = `artist:${encodeURIComponent(name)}`
      if (country) query += ` AND country:${encodeURIComponent(country)}`
      const q = `${MB_BASE}/artist?query=${query}&fmt=json&limit=10`

      // retry a couple times for transient network/TLS failures
      let s = null
      let retries = 2
      while (retries-- > 0) {
        try {
          s = await fetch(q, { headers: { 'User-Agent': userAgent } })
          if (s && s.ok) break
        } catch (err) {
          // wait and retry
          await sleep(1200)
        }
      }
      if (!s || !s.ok) return null
      const sj = await s.json()
      const candidates = sj.artists || []
      if (!candidates.length) return null

      // prefer exact name match (case-insensitive), else pick highest score if available
      artist = candidates.find(a => (a.name || '').toLowerCase() === name.toLowerCase()) || null
      if (!artist) {
        // choose highest score if provided by MB search
        artist = candidates.reduce((best, cur) => {
          const curScore = typeof cur.score === 'number' ? cur.score : parseInt(cur.score || '0', 10)
          const bestScore = typeof best.score === 'number' ? best.score : parseInt(best.score || '0', 10)
          return (curScore > bestScore) ? cur : best
        }, candidates[0])
      }

      // lookup artist (by selected candidate)
      const lookupUrl = `${MB_BASE}/artist/${artist.id}?inc=url-rels+release-groups&fmt=json`
      const l = await fetch(lookupUrl, { headers: { 'User-Agent': userAgent } })
      if (!l.ok) return null
      lj = await l.json()
    }

    const urls = (lj.relations || []).map(r => r.url && r.url.resource).filter(Boolean)
    const wiki = urls.find(u => u.includes('wikipedia.org')) || null

    let wikiData = null
    if (wiki) {
      try {
        const titleMatch = wiki.match(/\/wiki\/(.+)$/)
        if (titleMatch) {
          const title = decodeURIComponent(titleMatch[1])
          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
          const w = await fetch(wikiUrl, { headers: { 'User-Agent': userAgent } })
          if (w.ok) wikiData = await w.json()
        }
      } catch (err) {
        // ignore
      }
    }

    const releaseGroups = (lj['release-groups'] || []).filter(rg => rg['primary-type'] === 'Album' || rg['primary-type'] === 'EP')
    const albums = releaseGroups.map(rg => ({ title: rg.title, id: rg.id || null, first_release_date: rg['first-release-date'], songs: [] }))

    const songs = []

    if (fetchTracks && releaseGroups.length) {
      for (let i = 0; i < Math.min(releaseGroups.length, maxReleaseGroups); i++) {
        const rg = releaseGroups[i]
        try {
          const relsUrl = `${MB_BASE}/release-group/${rg.id}?inc=releases&fmt=json`
          const r1 = await fetch(relsUrl, { headers: { 'User-Agent': userAgent } })
          if (!r1.ok) { await sleep(delayMs); continue }
          const r1j = await r1.json()
          const releases = r1j.releases || []
          if (releases.length === 0) { await sleep(delayMs); continue }

          const releaseId = releases[0].id
          const tracksUrl = `${MB_BASE}/release/${releaseId}?inc=recordings&fmt=json`
          const r2 = await fetch(tracksUrl, { headers: { 'User-Agent': userAgent } })
          if (!r2.ok) { await sleep(delayMs); continue }
          const r2j = await r2.json()

          const medium = (r2j.media && r2j.media[0]) || null
          if (medium && medium.tracks && medium.tracks.length) {
            for (const t of medium.tracks) {
              if (t && t.title) {
                songs.push(t.title)
                albums[i].songs.push(t.title)
              }
            }
          }

          await sleep(delayMs)
        } catch (err) {
          // ignore network errors and continue
          await sleep(delayMs)
          continue
        }
      }
    }

    const uniqueSongs = Array.from(new Set(songs))

    const payload = {
      mbid: artist.id,
      name: artist.name,
      disambiguation: artist.disambiguation || null,
      country: artist.country || null,
      albums,
      songs: uniqueSongs,
      urls,
      wikipedia: wiki || null,
      description: wikiData && wikiData.extract ? wikiData.extract : (artist.disambiguation || null),
      image: (wikiData && (wikiData.originalimage && wikiData.originalimage.source)) || (wikiData && (wikiData.thumbnail && wikiData.thumbnail.source)) || null,
    }

    global.__mb_helper_cache.set(cacheKey, { payload, fetchedAt: Date.now() })
    return payload
  } catch (err) {
    return null
  }
}
