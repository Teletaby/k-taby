import { useState, useEffect, useRef } from 'react' 

export default function AdminControls({ modal = false, onClose } = {}) {
  const [admin, setAdmin] = useState(false)
  const [open, setOpen] = useState(modal)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const r = await fetch('/api/admin/status')
        const j = await r.json()
        if (mounted) setAdmin(!!j.admin)
      } catch (e) {}
    }
    check()
    return () => { mounted = false }
  }, [])

  const passwordRef = useRef(null)

  useEffect(() => {
    if (modal && passwordRef && passwordRef.current) {
      // small timeout to wait for modal render
      setTimeout(() => passwordRef.current && passwordRef.current.focus(), 20)
    }
  }, [modal])

  async function login(e) {
    e.preventDefault()
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'login failed')
      setAdmin(true); setOpen(false); setPassword('')
      if (modal && typeof onClose === 'function') onClose()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  async function logout() {
    setLoading(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      setAdmin(false)
    } catch (e) {}
    setLoading(false)
  }

  // Render a small inline panel when in modal mode, otherwise the existing dropdown button
  if (modal) {
    return (
      <div>
        {admin ? (
          <div>
            <div className="text-sm text-gray-600 mb-2">Signed in as admin</div>
            <div className="flex gap-2">
              <button onClick={logout} className="btn btn-muted">Sign out</button>
            </div>
          </div>
        ) : (
          <form onSubmit={login}>
            <label className="text-xs text-gray-600">Admin password</label>
            <input ref={passwordRef} type="password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full border px-2 py-1 rounded mt-1 mb-2 text-black" />
            {err && <div className="text-sm text-red-500 mb-2">{err}</div>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn btn-primary">Sign in</button>
              <button type="button" onClick={() => typeof onClose === 'function' ? onClose() : setOpen(false)} className="btn btn-danger">Cancel</button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded text-sm">Admin</button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded p-4 w-64 max-w-[90vw]">
          {admin ? (
            <div>
              <div className="text-sm text-gray-600 mb-2">Signed in as admin</div>
              <button onClick={logout} className="btn btn-muted">Sign out</button>
            </div>
          ) : (
            <form onSubmit={login}>
              <label className="text-xs text-gray-600">Admin password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full border px-2 py-1 rounded mt-1 mb-2 text-black" />
              {err && <div className="text-sm text-red-500 mb-2">{err}</div>}
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn btn-primary">Sign in</button>
                <button type="button" onClick={() => setOpen(false)} className="btn btn-danger">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
