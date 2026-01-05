import fs from 'fs'
import path from 'path'
import { fetchSpotify as fetchSpotifyFn, getAlbum as getAlbumFn } from '../../../lib/spotify'

function isAdmin(req) {
  const c = req.headers.cookie || ''
  return c.split(/;\s*/).some(x => x.trim() === 'ktaby_admin=1')
}

async function findArtistByName(name) {
  const q = encodeURIComponent(name)
  const j = await fetchSpotifyFn(`search?q=${q}&type=artist&limit=5`)
  const items = (j && j.artists && j.artists.items) || []
  if (!items.length) return null
  const exact = items.find(a => a.name.toLowerCase() === name.toLowerCase())
  if (exact) return exact
  const included = items.find(a => a.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(a.name.toLowerCase()))
  if (included) return included
  items.sort((a,b)=> (b.popularity||0)-(a.popularity||0))
  return items[0]
}

async function fetchAllAlbumsForArtist(artistId) {
  const albums = []
  let page = await fetchSpotifyFn(`artists/${artistId}/albums?include_groups=album,single,compilation,appears_on&limit=50`)
  albums.push(...(page.items||[]))
  while (page && page.next) {
    const relative = page.next.replace('https://api.spotify.com/v1/', '')
    page = await fetchSpotifyFn(relative)
    albums.push(...(page.items||[]))
  }
  const byName = new Map()
  for (const a of albums) {
    const key = (a.name || '').toLowerCase()
    if (!byName.has(key)) byName.set(key, a)
  }
  return Array.from(byName.values())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'not admin' })
  const { groupId, limitAlbums = 30 } = req.body || {}
  if (!groupId) return res.status(400).json({ ok: false, error: 'groupId required' })

  const filePath = path.resolve(process.cwd(), 'data', 'groups.json')
  const groups = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const group = groups.find(g => g.id === groupId)
  if (!group) return res.status(404).json({ ok: false, error: 'group not found' })

  try {
    let artist = null
    if (group.spotify && group.spotify.artistId) {
      try { artist = await fetchSpotifyFn(`artists/${group.spotify.artistId}`) } catch (e) { artist = null }
    }
    if (!artist) artist = await findArtistByName(group.name)
    if (!artist) return res.status(404).json({ ok: false, error: 'artist not found' })

    // Fetch new albums
    const rawAlbums = await fetchAllAlbumsForArtist(artist.id)
    const newAlbums = []
    let i = 0
    for (const a of rawAlbums) {
      if (i++ >= limitAlbums) break
      try {
        const full = await getAlbumFn(a.id)
        const tracksArray = Array.isArray(full.tracks) ? full.tracks : (full.tracks?.items || [])
        newAlbums.push({ 
          id: full.id, 
          name: full.name, 
          images: full.images || [], 
          total_tracks: tracksArray.length, 
          tracks: tracksArray 
        })
      } catch (e) { 
        console.error('Failed to fetch album', a.id, e.message)
      }
    }

    // Merge: keep old albums, add new ones that don't already exist
    const existingAlbumIds = new Set((group.spotify?.albums || []).map(a => a.id))
    const mergedAlbums = [...(group.spotify?.albums || [])]
    
    for (const newAlbum of newAlbums) {
      if (!existingAlbumIds.has(newAlbum.id)) {
        mergedAlbums.push(newAlbum)
      }
    }

    // Update group spotify data
    group.spotify = { 
      artistId: artist.id, 
      artistName: artist.name, 
      genres: artist.genres || [], 
      albums: mergedAlbums 
    }

    // backup and write
    fs.writeFileSync(filePath + `.bak.${Date.now()}`, JSON.stringify(groups, null, 2), 'utf8')
    fs.writeFileSync(filePath, JSON.stringify(groups, null, 2), 'utf8')

    return res.status(200).json({ 
      ok: true, 
      group: { id: group.id, spotify: group.spotify },
      addedCount: newAlbums.filter(a => !existingAlbumIds.has(a.id)).length
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ ok: false, error: e.message })
  }
}
