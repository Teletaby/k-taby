import Layout from '../../components/Layout'
import {useEffect, useState} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import groups from '../../data/groups.json'

export default function TabbyEdits() {
  const [tag, setTag] = useState('')
  const [items, setItems] = useState([])
  const [likedOnly, setLikedOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [importUrls, setImportUrls] = useState('')
  const [opStatus, setOpStatus] = useState(null)
  const [siteSocial, setSiteSocial] = useState({ tiktok: { image: '/placeholder.svg', url: 'https://www.tiktok.com/@tabby_edits' }, youtube: { image: '/placeholder.svg', url: 'https://www.youtube.com/@taby_edits' } })

  useEffect(() => {
    if (!tag && groups && groups.length) setTag(groups[0].id)
  }, [])

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    fetch(`/api/tabby_edits?tag=${encodeURIComponent(tag)}&liked=${likedOnly ? '1' : '0'}`)
      .then(r => r.json())
      .then(data => setItems(data.items || []))
      .finally(() => setLoading(false))
  }, [tag, likedOnly])

  const router = useRouter()

  const [autoImportAttempted, setAutoImportAttempted] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const r = await fetch('/api/admin/status')
        const j = await r.json()
        setIsAdmin(!!j.admin)
      } catch (e) {}
    }
    checkAdmin()

    // fetch current site social images for admin editing
    async function fetchSocial() {
      try {
        const r = await fetch('/api/site_social')
        if (!r.ok) return
        const j = await r.json()
        if (j && j.social) {
          setSiteSocial(j.social)
        }
      } catch (e) {}
    }
    fetchSocial()

    // support ?import=<url> prefill from bookmarklet
    if (router && router.query && router.query.import) {
      try {
        const val = Array.isArray(router.query.import) ? router.query.import[0] : router.query.import
        if (val) {
          const decoded = decodeURIComponent(String(val))
          setImportUrls(decoded)
          setOpStatus('Imported URL from bookmarklet — click Import to confirm')
        }
      } catch (e) {}
    }
  }, [router])

  // Auto-import when ?import=...&auto_import=1 is present and user is admin
  useEffect(() => {
    if (!isAdmin) return
    if (autoImportAttempted) return
    try {
      const imp = router && router.query && (Array.isArray(router.query.import) ? router.query.import[0] : router.query.import)
      const auto = router && router.query && (Array.isArray(router.query.auto_import) ? router.query.auto_import[0] : router.query.auto_import)
      if (imp && auto && String(auto) === '1') {
        const decoded = decodeURIComponent(String(imp))
        setAutoImportAttempted(true)
        setOpStatus('Auto-importing…')
        importUrlsAction(decoded)
      }
    } catch (e) {}
  }, [isAdmin, router, autoImportAttempted])

  async function importUrlsAction(urlsArg) {
    const raw = urlsArg ? (Array.isArray(urlsArg) ? urlsArg.join('\n') : String(urlsArg)) : importUrls
    if (!raw) return
    setOpStatus('Importing…')
    const urls = raw.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const r = await fetch('/api/tabby_edits/import', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ urls }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Import failed')
      setOpStatus(`Added ${j.count} items`)
      setImportUrls('')
      // refresh
      fetch(`/api/tabby_edits?tag=${encodeURIComponent(tag)}&liked=${likedOnly ? '1' : '0'}`)
        .then(r => r.json()).then(d => setItems(d.items || []))
    } catch (e) {
      setOpStatus(String(e.message))
    }
  }

  async function fetchLatestForTag() {
    setOpStatus('Fetching latest for tag…')
    try {
      const r = await fetch(`/api/tabby_edits/fetch?tag=${encodeURIComponent(tag)}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'fetch failed')
      setOpStatus(`Found ${j.found}, added ${j.added}`)
      // refresh
      fetch(`/api/tabby_edits?tag=${encodeURIComponent(tag)}&liked=${likedOnly ? '1' : '0'}`)
        .then(r => r.json()).then(d => setItems(d.items || []))
    } catch (e) { setOpStatus(String(e.message)) }
  }

  async function fetchLatestForUser() {
    setOpStatus('Fetching latest for user…')
    try {
      const r = await fetch(`/api/tabby_edits/fetch?user=tabby_edits`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'fetch failed')
      setOpStatus(`Found ${j.found}, added ${j.added}`)
      // refresh
      fetch(`/api/tabby_edits?tag=${encodeURIComponent(tag)}&liked=${likedOnly ? '1' : '0'}`)
        .then(r => r.json()).then(d => setItems(d.items || []))
    } catch (e) { setOpStatus(String(e.message)) }
  }

  async function toggleLike(id, liked) {
    await fetch('/api/tabby_edits/like', {method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({id, liked})})
    // refresh
    fetch(`/api/tabby_edits?tag=${encodeURIComponent(tag)}&liked=${likedOnly ? '1' : '0'}`)
      .then(r => r.json())
      .then(data => setItems(data.items || []))
  }

  return (
    <Layout title="tabby_edits - k-taby">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visit @tabby_edits</h1>
        <a href="https://www.tiktok.com/@tabby_edits" className="text-sm text-ktaby-500">Open on TikTok →</a>
      </div>

      <p className="mt-2 text-sm text-gray-600">Browse uploads and filter by group hashtag. Toggle "Liked only" to show just videos you've liked here.</p>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm">Liked only</label>
          <input type="checkbox" checked={likedOnly} onChange={e=>setLikedOnly(e.target.checked)} />
        </div>

        {groups.filter(g=>['unis','aespa','le-sserafim','twice','ive','meovv','nmixx','itzy','hearts2hearts','illit'].includes(g.id)).map(g => (
          <button
            key={g.id}
            className={`btn btn-pill text-sm ${tag===g.id ? 'bg-ktaby-600 text-white' : 'bg-gray-100 text-gray-800'}`}
            onClick={()=>setTag(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading && <p>Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-gray-500">No uploads found for #{tag} yet.</p>}

        {/* Admin import / fetch controls */}
        {isAdmin && (
          <div className="mt-4 p-3 border rounded bg-gray-50">
            <h3 className="font-semibold mb-2">Importer & fetch</h3>
            <p className="text-sm text-gray-600 mb-2">Paste one TikTok URL per line to import, or fetch the latest uploads from @tabby_edits or the current tag.</p>

            <div className="mb-2 flex gap-2">
              <button className="btn btn-ktaby md:w-auto" onClick={async ()=>{
                try {
                  const t = await navigator.clipboard.readText()
                  setImportUrls((prev)=> (prev ? prev + '\n' + t : t))
                  setOpStatus('Pasted from clipboard — click Import to confirm')
                } catch (e) { setOpStatus('Clipboard read failed') }
              }}>Paste from clipboard</button>

              <button className="btn btn-primary md:w-auto" onClick={async ()=>{
                try {
                  const t = await navigator.clipboard.readText()
                  setImportUrls((prev)=> (prev ? prev + '\n' + t : t))
                  // auto-import after paste
                  await importUrlsAction()
                } catch (e) { setOpStatus('Clipboard read failed') }
              }}>Paste & import</button>

              <button className="btn btn-muted md:w-auto" onClick={() => {
                // copy bookmarklet to clipboard (site origin will be inserted)
                try {
                  const origin = window.location.origin
                  const code = `javascript:(function(){window.open('${origin}/tabby_edits?import='+encodeURIComponent(location.href)+'&auto_import=1','_blank');})()`
                  navigator.clipboard.writeText(code)
                  setOpStatus('Bookmarklet copied to clipboard — paste as a new bookmark URL')
                } catch(e) { setOpStatus('Failed to copy bookmarklet') }
              }}>Copy bookmarklet</button>
            </div>

            <textarea className="w-full p-2 border rounded mb-2" rows={4} value={importUrls} onChange={e=>setImportUrls(e.target.value)} placeholder="https://www.tiktok.com/@tabby_edits/video/720..." />

            <div className="flex gap-2">
              <button className="btn btn-ktaby" onClick={importUrlsAction}>Import URLs</button>
              <button className="btn btn-primary" onClick={fetchLatestForUser}>Fetch latest from @tabby_edits</button>
              <button className="btn btn-muted" onClick={fetchLatestForTag}>Fetch latest for #{tag}</button>
            </div>

            <div className="mt-4 p-3 border rounded bg-white">
              <h4 className="font-medium mb-2">Social images</h4>
              <label className="block text-xs text-gray-600">TikTok image URL</label>
              <input className="w-full p-2 border rounded mb-2" value={siteSocial.tiktok.image} onChange={e=>setSiteSocial({...siteSocial, tiktok:{...siteSocial.tiktok, image:e.target.value}})} />
              <label className="block text-xs text-gray-600">TikTok link URL</label>
              <input className="w-full p-2 border rounded mb-2" value={siteSocial.tiktok.url} onChange={e=>setSiteSocial({...siteSocial, tiktok:{...siteSocial.tiktok, url:e.target.value}})} />

              <label className="block text-xs text-gray-600">YouTube image URL</label>
              <input className="w-full p-2 border rounded mb-2" value={siteSocial.youtube.image} onChange={e=>setSiteSocial({...siteSocial, youtube:{...siteSocial.youtube, image:e.target.value}})} />
              <label className="block text-xs text-gray-600">YouTube link URL</label>
              <input className="w-full p-2 border rounded mb-2" value={siteSocial.youtube.url} onChange={e=>setSiteSocial({...siteSocial, youtube:{...siteSocial.youtube, url:e.target.value}})} />

              <div className="flex gap-2">
                <button className="px-3 py-1 bg-ktaby-600 text-white rounded" onClick={async ()=>{
                  try {
                    setOpStatus('Saving…')
                    const r = await fetch('/api/site_social', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(siteSocial) })
                    const j = await r.json()
                    if (!r.ok) throw new Error(j.error || 'save failed')
                    setSiteSocial(j.social)
                    setOpStatus('Saved')
                  } catch (e) { setOpStatus(String(e.message)) }
                }}>Save images</button>
                <button className="px-3 py-1 bg-gray-200 text-gray-800 rounded" onClick={()=>{
                  setSiteSocial({ tiktok: { image: '/placeholder.svg', url: 'https://www.tiktok.com/@tabby_edits' }, youtube: { image: '/placeholder.svg', url: 'https://www.youtube.com/@taby_edits' } })
                }}>Reset</button>
              </div>
            </div>

            {opStatus && <div className="mt-2 text-sm text-gray-600">{opStatus}</div>}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(it => (
            <div key={it.id} className="border rounded p-2 bg-white">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {/* prefer embed iframe if videoId exists */}
                {it.videoId ? (
                  <iframe src={`https://www.tiktok.com/embed/v2/${it.videoId}`} width="100%" height="100%" frameBorder="0" scrolling="no" title={it.id}></iframe>
                ) : (
                  <a href={it.url} target="_blank" rel="noreferrer" className="block w-full h-full"><img src={it.thumbnail} alt={it.caption} className="w-full h-full object-cover"/></a>
                )}
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="text-sm">
                  <div className="font-medium">{it.caption}</div>
                  <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => toggleLike(it.id, true)} className="text-ktaby-600 text-sm">Like</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}