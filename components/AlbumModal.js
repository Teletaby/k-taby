import { useEffect, useState, useRef } from 'react'
import SpotifyPlayer from './SpotifyPlayer'
import SpotifyAlbum from './SpotifyAlbum'
import ModalPortal from './ModalPortal'

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
  const elRef = useRef(null)

  // ModalPortal now handles body scroll lock and ensures a single modal root; no local duplicate removal required
  useEffect(() => { return () => {} }, [])

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
    // wait for animation to finish then call parent onClose (matches transition duration)
    setTimeout(() => { if (onClose) onClose() }, 200)
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
    // prefer iframe player when we have a spotify id
    if (t.id) return (
      <div className="spotify-embed-wrap">
        <iframe className="spotify-embed" src={'https://open.spotify.com/embed/track/' + t.id} frameBorder="0" allow="encrypted-media; autoplay; clipboard-write" />
        <div className="mt-2 text-right">
          <a href={'https://open.spotify.com/track/' + t.id} target="_blank" rel="noreferrer" className="text-sm text-ktaby-500 underline">Open in Spotify</a>
        </div>
      </div>
    )

    // fallback to preview_url player when no spotify id available
    if (t.preview_url) return <SpotifyPlayer src={t.preview_url} title={t.name} />

    return <div className="text-sm text-gray-400">Preview not available</div>
  }

  if (!album) return null

  const spotifyId = getSpotifyId()

  return (
    <ModalPortal id="album-modal-root" onClose={handleClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={'Album details for ' + (album.name || album.title)}>
        <div className={'absolute inset-0 bg-black transition-opacity duration-200 ease-out ' + (visible ? 'opacity-50' : 'opacity-0')} onClick={handleClose} />

        <div id="album-modal" ref={(el)=>{ elRef.current = el; if (el && visible) { el.focus() } }} tabIndex={-1} className={
          'relative bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-white z-10 transform-gpu ' +
          'border-2 border-pink-200 dark:border-gray-600 rounded-2xl overflow-y-auto album-modal-scroll ' +
          (visible 
            ? 'opacity-100 scale-100 translate-y-0 animate-modal-open' 
            : 'opacity-0 scale-95 translate-y-8 animate-modal-close'
          ) +
          ' w-[95vw] max-w-sm h-[80vh] sm:w-[85vw] sm:max-w-2xl sm:h-[85vh] md:max-w-4xl transition-all duration-300 ease-out'
        }>

          {/* K-pop themed header with gradient background */}
          <div className="relative bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-400 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 p-4 sm:p-6 text-white animate-fade-in-up" style={{ minHeight: '160px', flexShrink: 0, animationDelay: '0.1s' }}>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="absolute top-4 left-4 w-8 h-8 bg-white rounded-full animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
              <div className="absolute top-8 right-8 w-6 h-6 bg-white rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}></div>
              <div className="absolute bottom-4 left-1/4 w-4 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
              <div className="absolute bottom-8 right-1/3 w-5 h-5 bg-white rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '3.2s'}}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center sm:flex-row sm:items-start gap-4 text-center sm:text-left">
              {/* Album art with K-pop styling */}
              <div className="w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0 album-modal-art transform hover:scale-105 transition-transform duration-300">
                <img
                  src={(details && details.images && details.images[0] && details.images[0].url) || '/placeholder.svg'}
                  alt={album.name || album.title}
                  className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-white/30"
                />
                {/* K-pop sparkle effect */}
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-300 rounded-full flex items-center justify-center text-xs">✨</div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-2xl font-bold break-words leading-tight mb-2 kpop-font">
                  {album.name || album.title}
                </h3>
                <div className="text-pink-100 text-sm sm:text-base break-words mb-2">
                  {(details && details.artists && details.artists.map(a=>a.name).join(', ')) || (album.artistName || '')}
                </div>
                {details && details.release_date ? (
                  <div className="text-xs text-cyan-100 bg-white/20 px-2 py-1 rounded-full inline-block mb-3">
                    Released: {details.release_date}
                  </div>
                ) : null}
                <div className="flex justify-center sm:justify-start">
                  {spotifyId ? (
                    <a
                      href={`https://open.spotify.com/album/${spotifyId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-spotify-kpop btn-animated inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-bold text-white shadow-xl border-2 border-white/30 hover:scale-105 transition-all duration-200"
                      aria-label={`Open ${album.name} in Spotify`}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56z"/>
                      </svg>
                      <span>Listen on Spotify</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Close button with K-pop styling */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500 hover:bg-red-600 text-white text-xl sm:text-2xl leading-none z-30 transition-all duration-200 hover:scale-110 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg border-2 border-white/30"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Main content area with K-pop theming */}
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Track list with K-pop styling */}
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-500">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Track List
              </h4>

                {loading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tracks…</p>
                  </div>
                )}

                {err && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
                    {err}
                  </div>
                )}

                {!loading && details && details.tracks && details.tracks.length > 0 && (
                  <div className="space-y-2">
                    {details.tracks.map((t, idx) => {
                      const trackNumber = (t.track_number && Number(t.track_number)) || (idx + 1)
                      return (
                        <div
                          key={t.id || String(trackNumber)}
                          className="album-track-row group bg-gradient-to-r from-white to-pink-50/30 dark:from-gray-700 dark:to-gray-600/30 p-3 sm:p-4 rounded-lg border border-pink-100 dark:border-gray-600 hover:border-purple-200 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0 border-2 border-white/30">
                                {trackNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                                  {t.name}
                                </div>
                                {t.duration_ms ? (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {Math.floor(t.duration_ms/1000/60)}:{String(Math.floor((t.duration_ms/1000)%60)).padStart(2,'0')}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="w-full">
                              {renderTrack(t)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              {!loading && (!details || !details.tracks || details.tracks.length === 0) && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <span className="text-2xl mb-2 block">🎧</span>
                  <p>No track preview available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}