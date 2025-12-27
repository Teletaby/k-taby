import { fetchSpotify } from '../../../lib/spotify'

export default async function handler(req, res) {
  try {
    const { q, type = 'album', limit = '1' } = req.query
    if (!q) return res.status(400).json({ error: 'query q required' })
    const url = `search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&limit=${encodeURIComponent(limit)}`
    const j = await fetchSpotify(url)
    return res.status(200).json(j)
  } catch (e) {
    console.error('spotify search error', e.message)
    const status = e.status || 500
    return res.status(status).json({ error: e.message })
  }
}