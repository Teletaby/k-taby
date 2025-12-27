import { useEffect, useState } from 'react'

export default function SpotifyConnect() {
  const [me, setMe] = useState(null)
  useEffect(() => {
    let mounted = true
    fetch('/api/spotify/me').then(r => r.json()).then(j => { if (mounted) setMe(j) }).catch(() => {})
    return () => mounted = false
  }, [])

  if (!me) return null
  if (me.connected) return (
    <div className="flex items-center gap-3">
      <div className="text-sm">Connected: <strong>{me.profile.display_name || me.profile.id}</strong></div>
      <button onClick={async () => { await fetch('/api/spotify/disconnect'); window.location.reload() }} className="text-xs bg-gray-100 px-2 py-1 rounded">Disconnect</button>
    </div>
  )

  return (
    <a href="/api/spotify/authorize" className="btn btn-primary">Connect Spotify</a>
  )
}
