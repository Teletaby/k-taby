import { fetchNewsForGroups } from '../../../lib/news'

export default async function handler(req, res) {
  try {
    const groups = require('../../../data/groups.json')
    const force = req.query.force === '1'
    const items = await fetchNewsForGroups(groups, { ttlMs: force ? 0 : undefined })
    res.status(200).json({ ok: true, count: items.length, items })
  } catch (err) {
    console.error('api/news error', err)
    res.status(500).json({ ok: false, error: err.message })
  }
}