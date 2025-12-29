import { fetchNewsForGroups } from '../../../lib/news'
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    // Delete existing news cache/backups to force a clean rebuild
    try {
      const DATA_DIR = path.resolve(process.cwd(), 'data')
      const files = fs.readdirSync(DATA_DIR)
      for (const f of files) {
        if (f.startsWith('news_cache') || f === 'news.json' || f.startsWith('news_latest')) {
          try {
            fs.unlinkSync(path.join(DATA_DIR, f))
            console.log('Deleted news file:', f)
          } catch (e) {
            console.error('Error deleting file', f, e)
          }
        }
      }
    } catch (e) {
      console.error('Error deleting cache files:', e)
    }

    const groups = require('../../../data/groups.json')
    const items = await fetchNewsForGroups(groups, { ttlMs: 0 })

    // write a fresh dump of final items to data/news.json
    try {
      const outFile = path.resolve(process.cwd(), 'data', 'news.json')
      fs.writeFileSync(outFile, JSON.stringify(items, null, 2), 'utf8')
      console.log('Wrote refreshed news to', outFile)
    } catch (e) {
      console.error('Error writing refreshed news file:', e)
    }

    res.status(200).json({ ok: true, count: items.length })
  } catch (err) {
    console.error('api/news/refresh error', err)
    res.status(500).json({ ok: false, error: err.message })
  }
}