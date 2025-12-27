import { useState } from 'react'

export default function AdminRefresh({ groupId }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  async function refresh() {
    setLoading(true); setMsg(null)
    try {
      const r = await fetch('/api/admin/refresh-spotify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'refresh failed')
      setMsg('Refreshed')
      // reload page to show new albums
      setTimeout(() => location.reload(), 800)
    } catch (e) {
      setMsg(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={refresh} disabled={loading} className="btn btn-muted">Refresh Spotify</button>
      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  )
}
