require('path')
const path = require('path')
try { require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') }) } catch (e) {}
const { getAlbum } = require('../lib/spotify')
;(async () => {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set – skipping smoke test')
    return
  }
  try {
    const albumId = process.env.SMOKE_SPOTIFY_ALBUM || '1ATL5GLyefJaxhQzSPVrLX' // sample album id
    console.log('fetching album', albumId)
    const a = await getAlbum(albumId)
    console.log('album OK', a.name, 'tracks', a.tracks.length)
    console.log(a.tracks.slice(0,3))
  } catch (e) {
    console.error('smoke failed', e.message)
    process.exit(1)
  }
})()