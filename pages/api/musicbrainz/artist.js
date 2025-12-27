import { getArtistEnrichment } from '../../../lib/musicbrainz'

export default async function handler(req, res) {
  const { name, mbid } = req.query
  if (!name && !mbid) return res.status(400).json({ error: 'Provide ?name=<artist name> or ?mbid=<musicbrainz id>' })

  try {
    const data = await getArtistEnrichment(name || mbid, { mbid: mbid })
    if (!data) return res.status(404).json({ error: 'artist not found or enrichment failed' })
    return res.status(200).json(data)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal error' })
  }
}
