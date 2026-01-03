import { getDatabase } from '../../../lib/mongodb'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminmoako'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = await getDatabase()
      const metaCollection = db.collection('meta')
      const songGameMaintenance = await metaCollection.findOne({ _id: 'song_game_maintenance' })
      return res.status(200).json({
        maintenance: songGameMaintenance || { enabled: false, message: '' }
      })
    } catch (e) {
      console.error('Error fetching song game maintenance:', e)
      return res.status(200).json({ maintenance: { enabled: false, message: '' } })
    }
  }

  if (req.method === 'POST') {
    const { password, enabled, message } = req.body || {}
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    try {
      const db = await getDatabase()
      const metaCollection = db.collection('meta')
      
      const maintenance = { enabled: !!enabled, message: message || '' }
      
      await metaCollection.updateOne(
        { _id: 'song_game_maintenance' },
        { $set: maintenance },
        { upsert: true }
      )
      
      return res.status(200).json({ ok: true, maintenance })
    } catch (e) {
      console.error('Error updating song game maintenance:', e)
      return res.status(500).json({ error: 'failed to update maintenance' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
