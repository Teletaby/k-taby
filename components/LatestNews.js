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
        <div className="text-sm text-cyan-600 dark:text-slate-400">Updated {Math.round((Date.now() - lastUpdated) / 1000)}s ago</div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 text-white rounded-full font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200" onClick={() => fetchLatest(true)} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className="text-xs px-3 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white rounded-full font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200" onClick={() => fetchLatest(false)}>Fetch</button>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 && <p className="text-cyan-600 dark:text-slate-400 bg-cyan-50/50 dark:bg-slate-800/50 p-4 rounded-lg border border-cyan-100 dark:border-slate-700">No recent news mentioning the tracked groups.</p>}
        {items.map(item => (
          <article key={item.link} className="p-6 border border-cyan-200/50 dark:border-slate-600/50 rounded-xl bg-gradient-to-r from-white to-cyan-50/30 dark:from-slate-800 dark:to-slate-700/30 shadow-lg hover:shadow-xl dark:shadow-slate-900/50 transition-all duration-300">
            <a href={item.link} target="_blank" rel="noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold text-lg hover:underline underline-offset-4 decoration-cyan-400 dark:decoration-cyan-500 transition-colors duration-200">{item.title}</a>
            <p className="text-sm text-cyan-500 dark:text-slate-400 mt-1">{item.pubDate}</p>
            <p className="text-cyan-700 dark:text-slate-300 mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.contentSnippet || item.content || '' }} />
            {item._mentions && item._mentions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item._mentions.map(m => (
                  <span key={m} className="text-xs bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 text-cyan-700 dark:text-slate-300 px-3 py-1 rounded-full border border-cyan-200/50 dark:border-slate-600/50 font-medium">{m}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
