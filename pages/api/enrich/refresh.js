import { getEnrichment, refreshEnrichment } from '../../../lib/enrichment'
import groups from '../../../data/groups.json'

export default async function handler(req, res) {
  // POST /api/enrich/refresh { groupId }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // simple protection: require secret in header in production
  if (process.env.NODE_ENV === 'production') {
    const token = req.headers['x-admin-token']
    if (!token || token !== process.env.ENRICH_SECRET) return res.status(401).json({ error: 'unauthorized' })
  }

  const { groupId } = req.body || {}
  if (!groupId) return res.status(400).json({ error: 'Provide groupId in body' })

  const group = groups.find(g => g.id === groupId)
  if (!group) return res.status(404).json({ error: 'group not found' })

  try {
    const payload = await refreshEnrichment(group.name, group.mbid ? { mbid: group.mbid } : {})
    if (!payload) {
      // fallback: try a direct MusicBrainz-only lookup (useful when TheAudioDB is empty or getEnrichment fails)
      try {
        const { getArtistEnrichment } = await import('../../../lib/musicbrainz.js')
        const mb = await getArtistEnrichment(group.name, { mbid: group.mbid, fetchTracks: true })
        if (mb) return res.status(200).json({ ok: true, data: { ...mb, source: 'musicbrainz', lastUpdated: Date.now() } })
      } catch (e) {
        console.error('fallback musicbrainz lookup failed', e)
      }
      return res.status(500).json({ error: 'enrichment failed' })
    }

    return res.status(200).json({ ok: true, data: payload })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal error' })
  }
}
