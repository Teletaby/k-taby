const fs = require('fs')
const path = require('path')
const { fetchFeed } = require('./rss')

const CACHE_FILE = path.resolve(process.cwd(), 'data', 'news_cache.json')
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8') || '{}')
  } catch (err) {
    console.error('read news cache failed', err)
    return {}
  }
}

function writeCache(obj) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (err) {
    console.error('write news cache failed', err)
  }
}

function normalizeText(s) {
  if (!s) return ''
  return s
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/["'’‘`·•–—_.,/\\()\[\]:;!?&%$#@+*=<>^~|{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function nameVariants(name) {
  const variants = new Set()
  if (!name) return []
  const base = normalizeText(name)
  variants.add(base)
  // tokens
  const tokens = base.split(' ').filter(Boolean)
  for (const t of tokens) variants.add(t)
  // concatenated
  variants.add(tokens.join(''))
  // initials (e.g., 'john doe' -> 'jd')
  if (tokens.length > 1) variants.add(tokens.map(t => t[0]).join(''))
  // bigrams (adjacent tokens) to help match partial mentions
  for (let i = 0; i < tokens.length - 1; i++) variants.add(`${tokens[i]} ${tokens[i + 1]}`)
  return Array.from(variants)
}

async function fetchNewsForGroups(groups, options = {}) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY
  const groupMap = {}
  // build variants map: variant -> set of group ids
  const variantToGroups = new Map()
  const allVariants = []

  for (const g of groups) {
    const gid = g.id
    const variants = new Set()
    // group name and id
    nameVariants(g.name).forEach(v => variants.add(v))
    variants.add(gid.toLowerCase())
    // explicit group aliases if present
    if (Array.isArray(g.aliases)) g.aliases.forEach(a => nameVariants(a).forEach(v => variants.add(v)))
    // add member names and their variants
    if (Array.isArray(g.members)) {
      for (const m of g.members) {
        nameVariants(m.name).forEach(v => variants.add(v))
        if (Array.isArray(m.aliases)) m.aliases.forEach(a => nameVariants(a).forEach(v => variants.add(v)))
      }
    }
    groupMap[gid] = { ...g, variants: Array.from(variants) }
    for (const v of variants) {
      if (!variantToGroups.has(v)) variantToGroups.set(v, new Set())
      variantToGroups.get(v).add(gid)
    }
    allVariants.push(...variants)
  }

  const key = `news:${Array.from(groups.map(g => g.id)).sort().join(',')}`
  const cache = readCache()
  const cached = cache[key]
  if (cached && Date.now() - (cached.fetchedAt || 0) < (options.ttlMs || CACHE_TTL)) {
    // Read runtime flags
    const NEWS_API_ONLY = (process.env.NEWS_API_ONLY === '1' || process.env.NEWS_API_ONLY === 'true')
    const NEWS_RSS_ONLY = (process.env.NEWS_RSS_ONLY === '1' || process.env.NEWS_RSS_ONLY === 'true')
    const BLACKLIST_DOMAINS = (process.env.NEWS_API_BLACKLIST_DOMAINS || 'soompi.com,soompi').split(',').map(s => s.trim()).filter(Boolean)

    // If the user explicitly requested RSS-only, skip using cached NewsAPI payloads to force a fresh RSS fetch
    if (!NEWS_RSS_ONLY) {
      let payload = Array.isArray(cached.payload) ? cached.payload.slice() : []
      if (Array.isArray(BLACKLIST_DOMAINS) && BLACKLIST_DOMAINS.length > 0 && payload.length > 0) {
        payload = payload.filter(a => {
          try {
            const urlHost = a.link ? new URL(a.link).hostname.toLowerCase() : ''
            const srcName = (a.sourceName || a.source || '').toLowerCase()
            for (const d of BLACKLIST_DOMAINS) {
              const dd = d.toLowerCase()
              if (urlHost.includes(dd) || srcName.includes(dd)) return false
            }
          } catch (e) {
            return true
          }
          return true
        })
      }
      if (payload && payload.length > 0) return payload
    }
    // If after filtering cache is empty or NEWS_RSS_ONLY is set, continue to fetch fresh results (respecting NEWS_API_ONLY/NEWS_RSS_ONLY below)
  }

  let articles = []

  const NEWS_RSS_ONLY = (process.env.NEWS_RSS_ONLY === '1' || process.env.NEWS_RSS_ONLY === 'true')

  let newsApiErrored = false
  // If the user requested RSS-only, skip NewsAPI even if an API key exists
  if (!NEWS_RSS_ONLY && NEWS_API_KEY) {
    try {
      // helper: fetch with retries and basic backoff for 429/5xx
      const fetchWithRetries = async (url, options = {}, retries = 3) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          const res = await fetch(url, options)
          if (res.ok) return res
          const status = res.status
          if (status === 429) {
            const ra = res.headers.get('retry-after')
            const waitMs = ra ? parseInt(ra, 10) * 1000 : Math.pow(2, attempt) * 1000
            await new Promise(r => setTimeout(r, waitMs))
            continue
          }
          if (status >= 500 && status < 600) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500))
            continue
          }
          // non-retryable status
          const text = await res.text().catch(() => '')
          throw new Error(`newsapi http ${status} ${text || ''}`)
        }
        throw new Error('newsapi retries exhausted')
      }

      const chunkSize = 8
      const fetched = []
      const daysWindow = options.fromDays || 7
      const fromIso = daysWindow ? new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString() : undefined
      for (let i = 0; i < groups.length; i += chunkSize) {
        const chunk = groups.slice(i, i + chunkSize)
        // build query with group name variations, member full names and tokens, and aliases
        const qParts = []
        for (const g of chunk) {
          const gname = (g.name || '').replace(/"/g, '')
          qParts.push(`"${gname}"`)
          qParts.push(gname)

          try {
            const cachePath = require('path').resolve(process.cwd(), 'data', 'enrichment_cache.json')
            if (require('fs').existsSync(cachePath)) {
              const enCache = JSON.parse(require('fs').readFileSync(cachePath, 'utf8') || '{}')
              const key = Object.keys(enCache).find(k => k.includes(g.id) || (enCache[k].name && enCache[k].name.toLowerCase().includes(gname.toLowerCase())))
              if (key && enCache[key] && Array.isArray(enCache[key].aliases)) {
                enCache[key].aliases.slice(0, 5).forEach(a => { qParts.push(`"${a.replace(/"/g,'')}"`); qParts.push(a) })
              }
            }
          } catch (e) { /* ignore */ }

          if (Array.isArray(g.aliases)) g.aliases.forEach(a => { qParts.push(`"${a.replace(/"/g, '')}"`); qParts.push(a) })

          if (Array.isArray(g.members)) {
            for (const m of g.members) {
              const mnRaw = (m.name || '').replace(/"/g, '')
              if (!mnRaw) continue
              qParts.push(`"${mnRaw}"`)
              // tokenized parts (3 tokens max)
              mnRaw.split(' ').filter(Boolean).slice(0, 3).forEach(tok => qParts.push(tok))
              if (Array.isArray(m.aliases)) m.aliases.forEach(a => { qParts.push(`"${a.replace(/"/g, '')}"`); qParts.push(a) })
            }
          }
        }

        // unique and trim
        const uniq = Array.from(new Set(qParts)).slice(0, 200)
        // NewsAPI has query length limits; split into smaller token groups to avoid queryTooLong
        const MAX_TOKENS_PER_QUERY = 40
        for (let s = 0; s < uniq.length; s += MAX_TOKENS_PER_QUERY) {
          const sub = uniq.slice(s, s + MAX_TOKENS_PER_QUERY)
          const q = sub.join(' OR ')

          // build query params with searchIn and optional from window
          const params = new URLSearchParams()
          params.set('q', q)
          params.set('language', 'en')
          params.set('pageSize', '100')
          params.set('searchIn', 'title,description,content')
          params.set('sortBy', options.sortBy || 'publishedAt')
          if (fromIso) params.set('from', fromIso)

          const url = `https://newsapi.org/v2/everything?${params.toString()}`
          // log briefly for debugging
          console.info('newsapi query', { chunk: i / chunkSize, subSegment: s / MAX_TOKENS_PER_QUERY, qLength: q.length })

          const r = await fetchWithRetries(url, { headers: { 'X-Api-Key': NEWS_API_KEY } }, 3)
          const j = await r.json()
          if (Array.isArray(j.articles) && j.articles.length > 0) {
            fetched.push(...j.articles.map(a => ({
              title: a.title,
              link: a.url,
              pubDate: a.publishedAt,
              content: a.content || a.description || '',
              contentSnippet: a.description || '',
              source: a.source && a.source.id ? a.source.id : null,
              sourceName: a.source && a.source.name ? a.source.name : null
            })))
          }
          // small delay to be polite and avoid throttling
          await new Promise(r => setTimeout(r, 350))
        }
      }

      // dedupe fetched by url
      const seenUrls = new Set()
      const deduped = []
      for (const a of fetched) {
        if (!a.link) continue
        if (seenUrls.has(a.link)) continue
        seenUrls.add(a.link)
        deduped.push(a)
      }
      articles = deduped
    } catch (e) {
      console.error('newsapi fetch error', e.message)
      newsApiErrored = true
    }
  }

  // Evaluate blacklisting and NEWS_API-only mode
  const NEWS_API_ONLY = (process.env.NEWS_API_ONLY === '1' || process.env.NEWS_API_ONLY === 'true')
  const BLACKLIST_DOMAINS = (process.env.NEWS_API_BLACKLIST_DOMAINS || 'soompi.com,soompi').split(',').map(s => s.trim()).filter(Boolean)

  // If NewsAPI used, filter out any blacklisted domains (e.g., Soompi) to prefer NewsAPI results
  if (NEWS_API_KEY && Array.isArray(BLACKLIST_DOMAINS) && BLACKLIST_DOMAINS.length > 0 && Array.isArray(articles) && articles.length > 0) {
    articles = articles.filter(a => {
      try {
        const urlHost = a.link ? new URL(a.link).hostname.toLowerCase() : ''
        const srcName = (a.sourceName || a.source || '').toLowerCase()
        for (const d of BLACKLIST_DOMAINS) {
          const dd = d.toLowerCase()
          if (urlHost.includes(dd) || srcName.includes(dd)) return false
        }
      } catch (e) {
        // ignore URL parse errors and keep the article
        return true
      }
      return true
    })
  }

  // fallback to RSS if no items and not forced to use NewsAPI only
  if ((!articles || articles.length === 0) && !NEWS_API_ONLY) {
    try {
      // Allow preferring a single RSS feed via env var (helps target Soompi directly)
      const preferredFeed = process.env.NEWS_RSS_PREFERRED_FEED
      const feeds = preferredFeed ? [{ name: 'preferred', url: preferredFeed }] : require('../data/feeds.json')
      let rssItems = []
      for (const feed of feeds) {
        try {
          const f = await fetchFeed(feed.url)
          rssItems = rssItems.concat(f.items || [])
        } catch (e) {
          console.error('feed error', feed.url, e.message)
        }
      }
      rssItems = rssItems.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
      articles = rssItems.map(it => ({
        title: it.title,
        link: it.link,
        pubDate: it.pubDate,
        content: it.content || '',
        contentSnippet: it.contentSnippet || ''
      }))
    } catch (e) {
      console.error('rss fallback failed', e.message)
    }
  }

  // annotate mentions using variants
  for (const art of articles) {
    const text = normalizeText(((art.title || '') + ' ' + (art.content || '') + ' ' + (art.contentSnippet || '')))
    const hits = new Set()
    for (const v of variantToGroups.keys()) {
      if (!v) continue
      if (text.includes(v)) {
        for (const gid of variantToGroups.get(v)) hits.add(gid)
      }
    }
    art._mentions = Array.from(hits).map(id => groupMap[id]?.name || id)
  }

  // filter to only items that mention groups
  articles = articles.filter(a => a._mentions && a._mentions.length > 0)

  // dedupe
  const seen = new Set(); const unique = []
  for (const it of articles) {
    if (!it.link) continue
    if (seen.has(it.link)) continue
    seen.add(it.link)
    unique.push(it)
  }
  const payload = unique.slice(0, 50)

  cache[key] = { fetchedAt: Date.now(), payload }
  writeCache(cache)

  return payload
}

// Balance articles across groups: round-robin pick up to `perGroup` articles per group until `total` reached.
function balanceArticles(articles = [], groups = [], options = {}) {
  const perGroup = options.perGroup || 2
  const total = options.total || 6

  if (!articles || articles.length === 0 || !groups || groups.length === 0) return []

  // Map group name lower -> group object
  const nameToGroup = new Map()
  for (const g of groups) nameToGroup.set((g.name || '').toLowerCase(), g)

  // Build queues per group of article indices sorted by date
  const groupQueues = groups.map(g => ({ id: g.id, name: g.name, queue: [] }))
  for (const art of articles) {
    const artDate = art.pubDate ? new Date(art.pubDate).getTime() : 0
    art._pubTime = artDate
  }

  // Sort articles by recency
  const sorted = [...articles].sort((a,b) => (b._pubTime || 0) - (a._pubTime || 0))

  // Assign articles to each group's queue if they mention the group (by name)
  for (const gq of groupQueues) {
    for (const art of sorted) {
      const mentions = (art._mentions || []).map(m => (m || '').toLowerCase())
      if (mentions.includes((gq.name || '').toLowerCase())) {
        gq.queue.push(art)
      }
    }
  }

  const assigned = new Set()
  const perGroupCount = {}
  const results = []
  let madeProgress = true

  while (results.length < total && madeProgress) {
    madeProgress = false
    for (const gq of groupQueues) {
      if (results.length >= total) break
      perGroupCount[gq.id] = perGroupCount[gq.id] || 0
      if (perGroupCount[gq.id] >= perGroup) continue
      // find first unassigned article in queue
      while (gq.queue.length > 0 && results.length < total) {
        const art = gq.queue.shift()
        if (!art || !art.link) continue
        if (assigned.has(art.link)) continue
        // assign it
        assigned.add(art.link)
        results.push(art)
        perGroupCount[gq.id]++
        madeProgress = true
        break
      }
    }
  }

  // fill remaining slots with any remaining articles by recency
  if (results.length < total) {
    for (const art of sorted) {
      if (results.length >= total) break
      if (!art.link) continue
      if (assigned.has(art.link)) continue
      assigned.add(art.link)
      results.push(art)
    }
  }

  return results
}

module.exports = { fetchNewsForGroups, balanceArticles }
