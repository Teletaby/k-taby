#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const minimist = require('minimist')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
const { fetchSpotify, getAlbum } = require('../lib/spotify')

const args = minimist(process.argv.slice(2), { boolean: ['dry-run'], default: { delay: 200, limitAlbums: 10 } })
const GROUPS_FILE = path.resolve(process.cwd(), 'data', 'groups.json')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function findArtistByName(name) {
  const q = encodeURIComponent(name)
  const j = await fetchSpotify(`search?q=${q}&type=artist&limit=5`)
  const items = (j && j.artists && j.artists.items) || []
  if (!items.length) return null
  const exact = items.find(a => a.name.toLowerCase() === name.toLowerCase())
  if (exact) return exact
  const included = items.find(a => a.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(a.name.toLowerCase()))
  if (included) return included
  items.sort((a,b) => (b.popularity||0)-(a.popularity||0))
  return items[0]
}

async function fetchAllAlbumsForArtist(artistId) {
  const albums = []
  let url = `artists/${artistId}/albums?include_groups=album,single,compilation,appears_on&limit=50`
  let page = await fetchSpotify(url)
  albums.push(...(page.items || []))
  while (page && page.next) {
    const relative = page.next.replace('https://api.spotify.com/v1/','')
    page = await fetchSpotify(relative)
    albums.push(...(page.items || []))
    await sleep(args.delay)
  }
  const byName = new Map()
  for (const a of albums) {
    const key = (a.name||'').toLowerCase()
    if (!byName.has(key)) byName.set(key,a)
  }
  return Array.from(byName.values())
}

async function main() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env.local')
    process.exit(1)
  }

  const ids = args._
  if (!ids || ids.length === 0) {
    console.error('Usage: node scripts/fetch_spotify_for.js <groupId> [groupId2] [--limitAlbums=N]')
    process.exit(1)
  }

  const groups = JSON.parse(fs.readFileSync(GROUPS_FILE,'utf8'))
  const bak = `${GROUPS_FILE}.bak.${Date.now()}`
  fs.writeFileSync(bak, JSON.stringify(groups,null,2),'utf8')
  console.log(`Backup written to ${bak}`)

  for (const id of ids) {
    const g = groups.find(x => x.id === id)
    if (!g) { console.warn(`Group not found: ${id}`); continue }
    console.log(`Processing group ${g.name} (${g.id})`)

    let artist = null
    try {
      artist = await findArtistByName(g.name)
    } catch (e) {
      console.error(`Spotify search failed for ${g.name}: ${e.message}`)
      continue
    }
    if (!artist) { console.warn(`Artist not found for ${g.name}`); continue }
    console.log(`Found artist ${artist.name} (${artist.id})`)

    let rawAlbums = []
    try {
      rawAlbums = await fetchAllAlbumsForArtist(artist.id)
      console.log(`Found ${rawAlbums.length} unique albums for ${artist.name}`)
    } catch (e) {
      console.error(`Failed to fetch albums for ${artist.id}: ${e.message}`)
      continue
    }

    const limit = Number(args.limitAlbums) || rawAlbums.length
    const albums = []
    let i=0
    for (const a of rawAlbums) {
      if (i++ >= limit) break
      try {
        const full = await getAlbum(a.id)
        albums.push({ id: full.id, name: full.name, images: full.images, total_tracks: full.tracks.length, tracks: full.tracks })
        await sleep(args.delay)
      } catch (e) {
        console.warn(`  failed to fetch album ${a.id}: ${e.message}`)
      }
    }

    g.spotify = { artistId: artist.id, artistName: artist.name, genres: artist.genres || [], albums }
    console.log(`Attached ${albums.length} albums to ${g.name}`)
  }

  if (args['dry-run']) {
    console.log('dry-run, not writing file')
    return
  }
  fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups,null,2),'utf8')
  console.log(`Updated ${GROUPS_FILE}`)
}

main().catch(err => { console.error(err); process.exit(1) })
