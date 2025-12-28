import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import Link from 'next/link'

export default function AdminPage() {
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' })
  const [refreshResults, setRefreshResults] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [groups, setGroups] = useState([])
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    checkAdminStatus()
    fetchMaintenance()
    fetchVisitors()
    fetchGroups()
  }, [])

  async function checkAdminStatus() {
    try {
      const r = await fetch('/api/admin/status')
      const j = await r.json()
      setAdmin(!!j.admin)
    } catch (e) {}
    setLoading(false)
  }

  async function fetchMaintenance() {
    try {
      const r = await fetch('/api/admin/maintenance')
      const j = await r.json()
      if (j.maintenance) setMaintenance(j.maintenance)
    } catch (e) {}
  }

  async function fetchVisitors() {
    try {
      const r = await fetch('/api/admin/visitors')
      const j = await r.json()
      if (j.visitors) setVisitors(j.visitors)
    } catch (e) {}
  }

  async function clearVisitors() {
    if (!confirm('Are you sure you want to clear all visitor logs? This action cannot be undone.')) return
    
    try {
      const r = await fetch('/api/admin/visitors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (r.ok) {
        setVisitors([])
        alert('Visitor logs cleared successfully!')
      } else {
        alert('Failed to clear visitor logs.')
      }
    } catch (e) {
      console.error('Error clearing visitors:', e)
      alert('Error clearing visitor logs.')
    }
  }

  async function fetchGroups() {
    try {
      const r = await fetch('/api/groups')
      const j = await r.json()
      if (j.groups) setGroups(j.groups)
    } catch (e) {}
  }

  async function login(e) {
    e.preventDefault()
    setAuthLoading(true)
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (r.ok) {
        setAdmin(true)
        setPassword('')
      } else {
        alert('Invalid password')
      }
    } catch (e) {
      alert('Login failed')
    }
    setAuthLoading(false)
  }

  async function toggleMaintenance() {
    const enabled = !maintenance.enabled
    const message = enabled ? 'Site is under maintenance — tune back soon!' : ''
    try {
      const r = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: prompt('Admin password:'), enabled, message })
      })
      if (r.ok) {
        setMaintenance({ enabled, message })
      }
    } catch (e) {}
  }

  async function refreshAll() {
    setRefreshResults('Refreshing...')
    try {
      const r = await fetch('/api/admin/refresh-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: prompt('Admin password:') })
      })
      const j = await r.json()
      setRefreshResults(j)
    } catch (e) {
      setRefreshResults({ error: e.message })
    }
  }

  async function refreshSpotify(groupId) {
    try {
      const r = await fetch('/api/admin/refresh-spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, password: prompt('Admin password:') })
      })
      const j = await r.json()
      alert(j.ok ? 'Spotify data refreshed!' : j.error)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      setAdmin(false)
      window.location.reload()
    } catch (e) {}
  }

  if (loading) {
    return (
      <Layout title="Admin">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-cyan-600">Loading...</div>
        </div>
      </Layout>
    )
  }

  if (!admin) {
    return (
      <Layout title="Admin">
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-cyan-200/50">
            <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Admin Access Required</h1>
            <p className="text-cyan-700 text-center mb-6">You need to sign in to access the admin panel.</p>
            <form onSubmit={login} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-800 mb-2">Admin Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-white/50"
                  placeholder="Enter admin password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="text-center mt-6">
              <Link href="/" className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Admin Panel">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Admin Panel</h1>
          <p className="text-cyan-700">Manage site settings, refresh data, and monitor visitors.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Site Controls */}
          <div className="bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 rounded-2xl shadow-xl p-6 border border-cyan-200/50">
            <h2 className="text-xl font-bold mb-4 text-cyan-800 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Site Controls
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-cyan-100/50">
                <div>
                  <div className="font-medium text-cyan-800">Maintenance Mode</div>
                  <div className="text-sm text-cyan-600">{maintenance.enabled ? 'Site is under maintenance' : 'Site is live'}</div>
                </div>
                <button
                  onClick={toggleMaintenance}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                    maintenance.enabled
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {maintenance.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              <div className="p-4 bg-white/50 rounded-lg border border-cyan-100/50">
                <div className="font-medium text-cyan-800 mb-2">Data Refresh</div>
                <div className="space-y-2">
                  <button
                    onClick={refreshAll}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Refresh All Group Data
                  </button>
                  {refreshResults && (
                    <div className="mt-2 p-2 bg-cyan-50 rounded text-sm text-cyan-800 max-h-32 overflow-y-auto">
                      {typeof refreshResults === 'string' ? refreshResults : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(refreshResults, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Spotify Refresh */}
          <div className="bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 rounded-2xl shadow-xl p-6 border border-cyan-200/50">
            <h2 className="text-xl font-bold mb-4 text-cyan-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.56-11.939-1.38-.479.16-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.224-.181-1.383-.781-.18-.601.181-1.221.781-1.381 4.499-1.189 11.379-.96 15.979 1.82.479.239.6 1.02.24 1.5-.318.62-.961.74-1.5.421z"/>
              </svg>
              Spotify Data
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-cyan-100/50">
                  <div className="flex items-center gap-3">
                    <img src={group.logo || group.image || '/placeholder.svg'} alt={group.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-medium text-cyan-800">{group.name}</span>
                  </div>
                  <button
                    onClick={() => refreshSpotify(group.id)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-1 rounded text-sm font-medium shadow hover:shadow-md transform hover:scale-105 transition-all duration-200"
                  >
                    Refresh
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Visitor Log */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 rounded-2xl shadow-xl p-6 border border-cyan-200/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-800 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Recent Visitors ({visitors.length})
              </h2>
              <button
                onClick={clearVisitors}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                disabled={visitors.length === 0}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Logs
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-200/50">
                    <th className="text-left py-2 px-3 text-cyan-800 font-medium">Time</th>
                    <th className="text-left py-2 px-3 text-cyan-800 font-medium">IP Address</th>
                    <th className="text-left py-2 px-3 text-cyan-800 font-medium">Browser</th>
                    <th className="text-left py-2 px-3 text-cyan-800 font-medium">Device</th>
                    <th className="text-left py-2 px-3 text-cyan-800 font-medium">Page</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.slice(0, 50).map((visitor, index) => (
                    <tr key={index} className="border-b border-cyan-100/30 hover:bg-white/30">
                      <td className="py-2 px-3 text-cyan-700">{new Date(visitor.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-3 text-cyan-700 font-mono">{visitor.ip}</td>
                      <td className="py-2 px-3 text-cyan-700">{visitor.browser}</td>
                      <td className="py-2 px-3 text-cyan-700">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          visitor.isMobile ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {visitor.isMobile ? 'Mobile' : 'Desktop'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-cyan-700 truncate max-w-xs">{visitor.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visitors.length === 0 && (
                <div className="text-center py-8 text-cyan-600">
                  No visitor data available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
