import Layout from '../../components/Layout'
import { useState, useEffect } from 'react'

export default function Admin() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    // fetch current maintenance state
    fetch('/api/admin/maintenance').then(r => r.json()).then(j => { if (j && j.maintenance) setMaintenance(j.maintenance) })
  }, [])

  async function doAuth() {
    // just verify by calling refresh-all with password but without triggering action
    setLoading(true)
    try {
      const r = await fetch('/api/admin/refresh-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      if (r.status === 200) {
        setAuthed(true)
      } else {
        alert('Invalid password')
      }
    } catch (err) {
      alert('Auth failed')
    } finally { setLoading(false) }
  }

  async function refreshAll() {
    if (!authed) return alert('Please authenticate')
    setLoading(true)
    setResults(null)
    try {
      const r = await fetch('/api/admin/refresh-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const j = await r.json()
      if (j && j.ok) setResults(j.results)
      else alert('Refresh failed')
    } catch (err) {
      alert('Refresh encountered error')
    } finally { setLoading(false) }
  }

  async function updateMaintenance(enabled) {
    if (!authed) return alert('Please authenticate')
    setLoading(true)
    try {
      const r = await fetch('/api/admin/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, enabled, message: msg }) })
      const j = await r.json()
      if (j && j.ok) setMaintenance(j.state.maintenance)
      else alert('Failed to set maintenance')
    } catch (err) {
      alert('Failed to set maintenance')
    } finally { setLoading(false) }
  }

  return (
    <Layout title="Admin - k-taby">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Admin panel</h1>

        {!authed ? (
          <div className="p-4 bg-white rounded border">
            <label className="block mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border p-2 w-full mb-2" />
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-ktaby-500 text-white rounded" onClick={doAuth} disabled={loading}>Sign in</button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white rounded border space-y-4">
            <div>
              <button className="px-4 py-2 bg-ktaby-500 text-white rounded" onClick={refreshAll} disabled={loading}>Refresh all groups</button>
              <span className="ml-3 text-sm text-gray-600">Click to refresh albums & songs for all groups</span>
            </div>

            <div>
              <label className="block mb-2">Maintenance message</label>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} className="border p-2 w-full mb-2" rows={3} placeholder="Enter maintenance message (leave blank to clear)" />
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={() => updateMaintenance(true)} disabled={loading}>Enable maintenance</button>
                <button className="px-4 py-2 bg-gray-100 rounded" onClick={() => updateMaintenance(false)} disabled={loading}>Disable maintenance</button>
              </div>
              <p className="mt-2 text-sm text-gray-600">Current: {maintenance.enabled ? 'Enabled' : 'Disabled'} — {maintenance.message}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Last run results</h3>
              {loading && <div className="flex items-center gap-2"><KpopSpinner /> Running…</div>}
              {results && (
                <ul className="list-disc ml-6">
                  {results.map(r => (
                    <li key={r.id}>{r.id}: {r.ok ? `${r.albums} albums, ${r.songs} songs (${r.source})` : 'FAILED'}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function KpopSpinner() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-pink-500 animate-spin-slow flex items-center justify-center text-white">💃</div>
      <style jsx>{`
        .animate-spin-slow { animation: spin 1.6s linear infinite }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
