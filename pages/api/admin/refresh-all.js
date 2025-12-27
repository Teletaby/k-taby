import groups from '../../../data/groups.json'
import { refreshEnrichment } from '../../../lib/enrichment'
import { readState } from '../../../lib/siteState'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminmoako'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { password } = req.body || {}
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' })

  const results = []
  for (const g of groups) {
    try {
      // refresh using mbid if present
      const payload = await refreshEnrichment(g.name, g.mbid ? { mbid: g.mbid } : {})
      if (payload) results.push({ id: g.id, ok: true, albums: payload.albums ? payload.albums.length : 0, songs: payload.songs ? payload.songs.length : 0, source: payload.source || 'unknown' })
      else results.push({ id: g.id, ok: false })
      // throttle to be polite
      await new Promise(r => setTimeout(r, 1200))
    } catch (err) {
      results.push({ id: g.id, ok: false, error: err.message })
    }
  }

  return res.status(200).json({ ok: true, results, maintenance: readState().maintenance })
}
