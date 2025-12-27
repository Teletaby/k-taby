import { useEffect, useState } from 'react'
import SpotifyPlayer from './SpotifyPlayer'
import SpotifyAlbum from './SpotifyAlbum'

export default function AlbumModal({ album, spotifyAlbums = [], onClose }) {
  const [details, setDetails] = useState(album)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  // Do not lock background scrolling — allow the page to handle overflow so only the outer scrollbar is shown
  // (This keeps a single scrollbar visible: the page's.)
  useEffect(() => {
    // no-op: intentionally avoid mutating document.body.style.overflow
    return () => {}
  }, [])

  // animation / visibility state
  const [visible, setVisible] = useState(false)
  const modalRef = (typeof window !== 'undefined') ? (window.__albumModalRef = null) : null

  // Lock body scroll while modal is open so the modal handles scrolling internally
  useEffect(() => {
    const prev = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    // start show animation
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (visible && typeof document !== 'undefined') {
      // focus modal for accessibility
      const el = document.getElementById('album-modal')
      if (el) el.focus()
    }
  }, [visible])

  function handleClose() {
    setVisible(false)
    // pause any playing preview
    try { const mod = require('./SpotifyPlayer'); if (mod && mod.pausePreview) mod.pausePreview() } catch (e) {}
    // wait for animation to finish then call parent onClose
    setTimeout(() => { if (onClose) onClose() }, 220)
  }

  function getSpotifyId() {
    // prefer album.id if it's a 22-char spotify id
    if (album && album.id && /^[A-Za-z0-9]{22}$/.test(album.id)) return album.id
    // check details (maybe we've fetched and it contains an id)
    if (details && details.id && /^[A-Za-z0-9]{22}$/.test(details.id)) return details.id

    const name = (album.name || album.title || '').toLowerCase()
    if (!name) return null

    for (const sa of spotifyAlbums) {
      if (!sa) continue
      const sname = (sa.name || '').toLowerCase()
      if (!sname) continue
      if (sname === name || sname.includes(name) || name.includes(sname)) {
        if (sa.id && /^[A-Za-z0-9]{22}$/.test(sa.id)) return sa.id
      }
    }
    return null
  }

  useEffect(() => {
    let mounted = true
    async function fetchDetails() {
      // If we already have tracks and images, no need to fetch
      if (details && details.tracks && details.tracks.length && (details.images && details.images.length)) return

      // find spotify id via helper above
      const spotifyId = getSpotifyId()
      if (!spotifyId) return

      try {
        setLoading(true)
        const r = await fetch(`/api/spotify/album/${encodeURIComponent(spotifyId)}`)
        if (!r.ok) throw new Error('album fetch failed')
        const j = await r.json()
        if (!mounted) return
        setDetails(prev => ({ ...(prev || {}), ...j }))
      } catch (e) {
        if (!mounted) return
        setErr(e.message)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    fetchDetails()
    return () => { mounted = false }
  }, [album, spotifyAlbums, details])

  function renderTrack(t) {
    if (!t) return null
    if (t.preview_url) return <SpotifyPlayer src={t.preview_url} title={t.name} />
    if (t.id) return (
      <div className="w-full">
        <iframe className="spotify-embed" src={'https://open.spotify.com/embed/track/' + t.id} frameBorder="0" allow="encrypted-media; autoplay; clipboard-write" />
        <div className="mt-2 text-right">
          <a href={'https://open.spotify.com/track/' + t.id} target="_blank" rel="noreferrer" className="text-sm text-ktaby-500 underline">Open in Spotify</a>
        </div>
      </div>
    )
    return <div className="text-sm text-gray-400">Preview not available</div>
  }

  if (!album) return null

  const spotifyId = getSpotifyId()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={'Album details for ' + (album.name || album.title)}>
      <div className={'absolute inset-0 bg-black transition-opacity duration-200 ' + (visible ? 'opacity-50' : 'opacity-0')} onClick={handleClose} />

      <div id="album-modal" ref={(el)=>{ if (el && visible) { el.focus() } }} tabIndex={-1} className={
        'relative bg-white text-gray-900 z-10 w-[90%] max-w-md max-h-[90vh] overflow-auto transform transition-all duration-200 shadow-2xl ' +
        (visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3') +
        ' sm:max-w-2xl rounded-lg p-4 sm:p-6'
      }>

        <div className="album-modal-content relative bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-hidden">
          <div className="modal-handle hidden" />

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-full sm:w-40 album-modal-art">
              <img src={(details && details.images && details.images[0] && details.images[0].url) || '/placeholder.svg'} alt={album.name || album.title} className="w-full h-40 object-cover rounded-lg" />
            </div>

            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold truncate">{album.name || album.title}</h3>
              <div className="text-sm text-gray-600 mt-1 truncate">{(details && details.artists && details.artists.map(a=>a.name).join(', ')) || (album.artistName || '')}</div>
              {details && details.release_date ? <div className="text-xs text-gray-500 mt-2">Released: {details.release_date}</div> : null}

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {spotifyId ? (<a href={`https://open.spotify.com/album/${spotifyId}`} target="_blank" rel="noreferrer" className="btn btn-ktaby w-full sm:w-auto">Open in Spotify</a>) : null}
                <button onClick={handleClose} className="btn btn-muted w-full sm:w-auto">Close</button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            {spotifyId ? (
              <SpotifyAlbum albumId={spotifyId} noImage />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="text-sm text-gray-600">{(details && details.artists && details.artists.map(a=>a.name).join(', ')) || (album.artistName || '')}</div>

                {loading && <p className="mt-4 text-gray-600">Loading tracks…</p>}
                {err && <p className="mt-4 text-red-500">{err}</p>}

                {!loading && details && details.tracks && details.tracks.length > 0 && (
                  <div className="mt-2 divide-y divide-gray-100 rounded-md overflow-hidden">
                    {details.tracks.map(t => (
                      <div key={t.id || String(t.track_number)} className="album-track-row p-3 flex items-center gap-4">
                        <div className="w-8 text-sm text-gray-500">{t.track_number}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{t.name}</div>
                          {t.duration_ms ? <div className="text-xs text-gray-400 mt-1">{Math.floor(t.duration_ms/1000/60)}:{String(Math.floor((t.duration_ms/1000)%60)).padStart(2,'0')}</div> : null}
                        </div>
                        <div className="w-40 md:w-56">
                          {renderTrack(t)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && (!details || !details.tracks || details.tracks.length === 0) && (
                  <p className="mt-4 text-gray-600">No track preview available.</p>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}