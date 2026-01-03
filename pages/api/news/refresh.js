import { fetchNewsForGroups } from '../../../lib/news'
import { getDatabase } from '../../../lib/mongodb'
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    const db = await getDatabase()
    const groups = require('../../../data/groups.json')
    
    // Delete news.json file to prevent it from being used as a cache
    try {
      const newsJsonPath = path.resolve(process.cwd(), 'data', 'news.json')
      if (fs.existsSync(newsJsonPath)) {
        fs.unlinkSync(newsJsonPath)
        console.log('🗑️  Deleted news.json cache file')
      }
    } catch (e) {
      console.error('Error deleting news.json:', e)
    }
    
    // Completely clear all existing news from MongoDB FIRST
    let clearedCount = 0
    try {
      const newsCollection = db.collection('news')
      const deleteResult = await newsCollection.deleteMany({})
      clearedCount = deleteResult.deletedCount
      console.log('⚠️ CLEARED MongoDB news collection, deleted:', clearedCount, 'old documents')
    } catch (e) {
      console.error('Error clearing news collection:', e)
    }
    
    // Now fetch fresh news from sources
    console.log('🔄 Fetching fresh news from sources...')
    const items = await fetchNewsForGroups(groups, { ttlMs: 0 })
    console.log('✅ Fetched', items.length, 'fresh news items from sources')

    // Store ONLY the fresh news in MongoDB (nothing else)
    try {
      const newsCollection = db.collection('news')
      if (items.length > 0) {
        const insertResult = await newsCollection.insertMany(items.map(item => ({
          ...item,
          fetchedAt: new Date()
        })))
        console.log('✅ Stored', insertResult.insertedCount, 'FRESH items in MongoDB (no old data)')
      }
    } catch (e) {
      console.error('Error storing news in MongoDB:', e)
    }

    // Update the last refresh timestamp in MongoDB
    try {
      const metaCollection = db.collection('meta')
      await metaCollection.updateOne(
        { _id: 'news_last_refresh' },
        { $set: { timestamp: new Date(), count: items.length } },
        { upsert: true }
      )
      console.log('✅ Updated refresh timestamp')
    } catch (e) {
      console.error('Error updating refresh timestamp:', e)
    }

    // Return the balanced items
    const { balanceArticles } = require('../../../lib/news')
    const balanced = balanceArticles(items, groups, { perGroup: 2, total: 10 })
    
    // Sort balanced articles by pubDate descending (latest first)
    balanced.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime()
      const dateB = new Date(b.pubDate || 0).getTime()
      return dateB - dateA
    })
    
    // Add cache-busting headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    console.log('✅ Returning', balanced.length, 'balanced fresh items to client')
    res.status(200).json({ ok: true, count: items.length, balanced: balanced.length, items: balanced, cleared: clearedCount })
  } catch (err) {
    console.error('api/news/refresh error', err)
    res.status(500).json({ ok: false, error: err.message })
  }
}
