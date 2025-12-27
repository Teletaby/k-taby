#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const minimist = require('minimist')
const { fetchSpotify, getAlbum } = require('../lib/spotify')

const args = minimist(process.argv.slice(2), {
  boolean: ['dry-run', 'force'],
  default: { 'delay': 200, 'limitAlbums': 50 }
})

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
  items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  return items[0]
}

async function fetchAllAlbumsForArtist(artistId) {
  const albums = []
  let url = `artists/${artistId}/albums?include_groups=album,single,compilation,appears_on&limit=50`
  let page = await fetchSpotify(url)
  albums.push(...(page.items || []))
  while (page && page.next) {
    const relative = page.next.replace('https://api.spotify.com/v1/', '')
    page = await fetchSpotify(relative)
    albums.push(...(page.items || []))
    await sleep(args.delay)
  }
  // dedupe by name (case-insensitive)
  const byName = new Map()
  for (const a of albums) {
    const key = (a.name || '').toLowerCase()
    if (!byName.has(key)) byName.set(key, a)
  }
  return Array.from(byName.values())
}

function backupFile(filePath) {
  const orig = fs.readFileSync(filePath, 'utf8')
  const bakPath = `${filePath}.bak.${Date.now()}`
  fs.writeFileSync(bakPath, orig, 'utf8')
  return bakPath
}

async function main() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error('ERROR: Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your environment or .env.local')
    process.exit(1)
  }

  const groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'))
  const summary = { processed: 0, updated: 0, skipped: 0, errors: [] }

  for (const group of groups) {
    summary.processed++
    try {
      // skip if we already have spotify data and not forced
      if (group.spotify && !args.force) {
        summary.skipped++
        console.log(`skip: ${group.name} (spotify data present)`) 
        continue
      }
      console.log(`processing: ${group.name}`)

      let artist = null
      if (group.spotify && group.spotify.artistId) {
        // fetch artist to verify
        try {
          artist = await fetchSpotify(`artists/${group.spotify.artistId}`)
        } catch (e) {
          console.warn(`artist fetch failed for id ${group.spotify.artistId}, will search by name`) 
        }
      }

      if (!artist) {
        artist = await findArtistByName(group.name)
      }
      if (!artist) {
        console.warn(`artist not found for ${group.name}`)
        continue
      }

      console.log(`found artist: ${artist.name} (id=${artist.id})`)
      const rawAlbums = await fetchAllAlbumsForArtist(artist.id)
      console.log(`found ${rawAlbums.length} albums (unique by name) for ${artist.name}`)

      const limitAlbums = Number(args.limitAlbums) || rawAlbums.length
      const albums = []
      let i = 0
      for (const a of rawAlbums) {
        if (i++ >= limitAlbums) break
        try {
          console.log(` fetching album ${a.name} (${a.id})`)
          const full = await getAlbum(a.id)
          albums.push({ id: full.id, name: full.name, images: full.images, total_tracks: full.tracks.length, tracks: full.tracks })
          await sleep(args.delay)
        } catch (e) {
          console.warn(`  failed to fetch album ${a.id}: ${e.message}`)
        }
      }

      // attach spotify data to group
      group.spotify = {
        artistId: artist.id,
        artistName: artist.name,
        genres: artist.genres || [],
        albums
      }

      summary.updated++

    } catch (e) {
      summary.errors.push({ group: group.name, message: e.message })
      console.error(`error processing ${group.name}: ${e.stack || e.message}`)
    }
  }

  if (args['dry-run']) {
    console.log('Dry run complete. No changes written.')
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const bak = backupFile(GROUPS_FILE)
  fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf8')
  console.log(`Wrote updated groups to ${GROUPS_FILE} (backup at ${bak})`)
  console.log('Summary:', summary)
}

main().catch(err => { console.error(err); process.exit(1) })
