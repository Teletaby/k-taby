import { fetchNewsForGroups } from '../../../lib/news'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    const groups = require('../../../data/groups.json')
    const items = await fetchNewsForGroups(groups, { ttlMs: 0 })
    res.status(200).json({ ok: true, count: items.length })
  } catch (err) {
    console.error('api/news/refresh error', err)
    res.status(500).json({ ok: false, error: err.message })
  }
}