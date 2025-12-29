import { fetchNewsForGroups } from '../../../lib/news'
import fs from 'fs'
import path from 'path'

const CACHE_FILE = path.resolve(process.cwd(), 'data', 'news_cache.json')

export default async function handler(req, res) {
  try {
    const groups = require('../../../data/groups.json')
    const force = req.query.force === '1'
    
    if (force) {
      // Delete the cache file(s) to force a complete refresh (remove backups too)
      try {
        const DATA_DIR = path.resolve(process.cwd(), 'data')
        const files = fs.readdirSync(DATA_DIR)
        for (const f of files) {
          // remove any files that look like news cache or prior dump files
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
    }
    
    const itemsRaw = await fetchNewsForGroups(groups, { ttlMs: force ? 0 : undefined })
    
    // Balance articles across groups (max 2 per group, total 10)
    const { balanceArticles } = require('../../../lib/news')
    let balanced = balanceArticles(itemsRaw, groups, { perGroup: 2, total: 10 })
    
    // If force refresh, reverse the order to show change
    if (force) {
      balanced = balanced.reverse()
    }

    // If this was a force refresh, also write a fresh JSON dump of the final items
    if (force) {
      try {
        const outFile = path.resolve(process.cwd(), 'data', 'news.json')
        fs.writeFileSync(outFile, JSON.stringify(balanced, null, 2), 'utf8')
        console.log('Wrote refreshed news to', outFile)
      } catch (e) {
        console.error('Error writing refreshed news file:', e)
      }
    }
    
    res.status(200).json({ ok: true, count: balanced.length, items: balanced })
  } catch (err) {
    console.error('api/news error', err)
    res.status(500).json({ ok: false, error: err.message })
  }
}