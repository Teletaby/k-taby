require('path')
const path = require('path')
// load .env.local for local scripts so NEWS_API_KEY is available
try { require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') }) } catch (e) { /* noop */ }

const { fetchNewsForGroups } = require('../lib/news')
const groups = require('../data/groups.json')

;(async () => {
  try {
    console.log('Running news smoke test')
    console.log('NEWS_API_KEY present?', !!process.env.NEWS_API_KEY)
    if (process.env.NEWS_API_ONLY) console.log('NEWS_API_ONLY set? true')
    const ttlMs = process.env.SMOKE_TTL ? parseInt(process.env.SMOKE_TTL, 10) : undefined
    const items = await fetchNewsForGroups(groups.slice(0, 6), { fromDays: 7, sortBy: 'relevancy', ttlMs })
    console.log('fetched items:', items.length)
    console.log(items.slice(0, 6).map(i => ({ title: i.title, link: i.link, pubDate: i.pubDate, source: i.sourceName || i.source, mentions: i._mentions || [] })))
  } catch (e) {
    console.error('smoke test failed:', e.message)
    process.exit(1)
  }
})()
