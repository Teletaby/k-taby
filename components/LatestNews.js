import { useEffect, useState } from 'react'

export default function LatestNews({ initialItems = [], pollInterval = 180000 }) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(Date.now())

  async function fetchLatest(force = false) {
    try {
      setLoading(true)
      const url = `/api/news${force ? '?force=1' : ''}`
      const r = await fetch(url)
      if (!r.ok) return
      const j = await r.json()
      if (j && j.items) setItems(j.items)
      setLastUpdated(Date.now())
    } catch (e) {
      console.error('fetchLatest error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setInterval(() => fetchLatest(false), pollInterval)
    return () => clearInterval(t)
  }, [pollInterval])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">Updated {Math.round((Date.now() - lastUpdated) / 1000)}s ago</div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 border rounded" onClick={() => fetchLatest(true)} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className="text-xs px-2 py-1 border rounded" onClick={() => fetchLatest(false)}>Fetch</button>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 && <p className="text-gray-600">No recent news mentioning the tracked groups.</p>}
        {items.map(item => (
          <article key={item.link} className="p-4 border rounded bg-white shadow-sm">
            <a href={item.link} target="_blank" rel="noreferrer" className="text-ktaby-500 font-semibold">{item.title}</a>
            <p className="text-sm text-gray-600">{item.pubDate}</p>
            <p className="text-gray-700 mt-2" dangerouslySetInnerHTML={{ __html: item.contentSnippet || item.content || '' }} />
            {item._mentions && item._mentions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item._mentions.map(m => (
                  <span key={m} className="text-xs bg-ktaby-100 text-ktaby-700 px-2 py-1 rounded-full">{m}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
