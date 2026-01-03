import { fetchNewsForGroups } from '../../../lib/news'
import { getDatabase } from '../../../lib/mongodb'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default async function handler(req, res) {
  try {
    const groups = require('../../../data/groups.json')
    const force = req.query.force === '1'
    
    let itemsRaw = []
    let shouldRefresh = force
    
    // Check if refresh is needed (once per day)
    if (!force) {
      try {
        const db = await getDatabase()
        const metaCollection = db.collection('meta')
        const lastRefresh = await metaCollection.findOne({ _id: 'news_last_refresh' })
        
        if (lastRefresh && lastRefresh.timestamp) {
          const timeSinceRefresh = Date.now() - new Date(lastRefresh.timestamp).getTime()
          shouldRefresh = timeSinceRefresh > ONE_DAY_MS
        } else {
          shouldRefresh = true // Never refreshed before
        }
      } catch (e) {
        console.error('Error checking refresh timestamp:', e)
        shouldRefresh = true // Refresh on error to be safe
      }
    }
    
    // Fetch news if refresh is needed
    if (shouldRefresh) {
      console.log('📰 Fetching fresh news (refresh needed)')
      itemsRaw = await fetchNewsForGroups(groups, { ttlMs: 0 })
      
      // Store in MongoDB - clear old first
      try {
        const db = await getDatabase()
        const newsCollection = db.collection('news')
        const metaCollection = db.collection('meta')
        
        // Clear old news and insert new
        const deleteResult = await newsCollection.deleteMany({})
        console.log('⚠️ Cleared', deleteResult.deletedCount, 'old items from MongoDB')
        
        if (itemsRaw.length > 0) {
          const insertResult = await newsCollection.insertMany(itemsRaw.map(item => ({
            ...item,
            fetchedAt: new Date()
          })))
          console.log('✅ Inserted', insertResult.insertedCount, 'fresh items into MongoDB')
        }
        
        // Update refresh timestamp
        await metaCollection.updateOne(
          { _id: 'news_last_refresh' },
          { $set: { timestamp: new Date() } },
          { upsert: true }
        )
        
        console.log('✅ Stored news in MongoDB and updated refresh timestamp')
      } catch (e) {
        console.error('Error storing news in MongoDB:', e)
      }
    } else {
      // Read fresh news from MongoDB ONLY
      try {
        const db = await getDatabase()
        const newsCollection = db.collection('news')
        const rawItems = await newsCollection.find({}).sort({ pubDate: -1 }).toArray()
        // Remove MongoDB metadata fields
        itemsRaw = rawItems.map(item => {
          const { _id, fetchedAt, ...rest } = item
          return rest
        })
        console.log('✅ Retrieved', itemsRaw.length, 'cached news items from MongoDB')
      } catch (e) {
        console.error('❌ Error reading news from MongoDB:', e)
        itemsRaw = []
      }
    }
    
    // Balance articles across groups (max 2 per group, total 10)
    const { balanceArticles } = require('../../../lib/news')
    let balanced = balanceArticles(itemsRaw, groups, { perGroup: 2, total: 10 })
    
    // Sort balanced articles by pubDate descending (latest first)
    balanced.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime()
      const dateB = new Date(b.pubDate || 0).getTime()
      return dateB - dateA
    })
    
    // If force refresh, reverse the order to show change
    if (force) {
      balanced = balanced.reverse()
    }
    
    // Add cache-busting headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    res.status(200).json({ ok: true, count: balanced.length, items: balanced, refreshed: shouldRefresh })
  } catch (err) {
    console.error('api/news error', err)
    res.status(500).json({ ok: false, error: err.message })
  }
}