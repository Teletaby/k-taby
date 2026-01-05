import { useEffect, useState, useRef } from 'react'
import SpotifyPlayer from './SpotifyPlayer'
import ModalPortal from './ModalPortal'

export default function SongModal({ song, onClose }) {
  const [visible, setVisible] = useState(true)
  const elRef = useRef(null)

  useEffect(() => {
    // no-op: intentionally avoid mutating document.body.style.overflow
    return () => {}
  }, [])

  useEffect(() => {
    if (visible && typeof document !== 'undefined') {
      // focus modal for accessibility
      const el = document.getElementById('song-modal')
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

  if (!song) return null

  return (
    <ModalPortal id="song-modal-root" onClose={handleClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Song details for ${song.name}`}>
        <div className={'absolute inset-0 bg-black transition-opacity duration-200 ease-out ' + (visible ? 'opacity-50' : 'opacity-0')} onClick={handleClose} />

        <div id="song-modal" ref={(el)=>{ elRef.current = el; if (el && visible) { el.focus() } }} tabIndex={-1} className={
          'relative bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-white z-50 transform-gpu ' +
          'border-2 border-pink-200 dark:border-gray-600 rounded-2xl ' +
          (visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-8'
          ) +
          ' w-[90vw] max-w-xs sm:w-[80vw] sm:max-w-sm transition-all duration-300 ease-out'
        }>

          {/* Header */}
          <div className="relative bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-400 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 p-3 sm:p-4 text-white animate-fade-in-up" style={{ minHeight: '160px', flexShrink: 0, animationDelay: '0.1s' }}>
            {/* Album art */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 album-modal-art transform hover:scale-105 transition-transform duration-300">
              <img
                src={song.album?.images?.[0]?.url || '/placeholder.svg'}
                alt={song.album?.name}
                className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-white/30"
              />
            </div>

            <div className="text-center">
              <h3 className="text-base sm:text-lg font-bold break-words leading-tight mb-1 kpop-font">
                {song.name}
              </h3>
              <div className="text-pink-100 text-sm break-words mb-1">
                {song.artists?.map(artist => artist.name).join(', ')}
              </div>
              <div className="text-xs text-cyan-100 bg-white/20 px-2 py-1 rounded-full inline-block mb-2">
                From: {song.album?.name}
              </div>
              <div className="flex justify-center">
                {song.id ? (
                  <a
                    href={`https://open.spotify.com/track/${song.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-spotify-kpop btn-animated inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-bold text-white shadow-xl border-2 border-white/30 hover:scale-105 transition-all duration-200"
                    aria-label={`Open ${song.name} in Spotify`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56z"/>
                    </svg>
                    <span>Listen on Spotify</span>
                  </a>
                ) : null}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl leading-none z-30 transition-all duration-200 hover:scale-110 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg border-2 border-white/30"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 sm:p-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Song details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Duration:</span>
                  <div className="text-gray-900 dark:text-white">
                    {song.duration_ms ? `${Math.floor(song.duration_ms / 60000)}:${String(Math.floor((song.duration_ms % 60000) / 1000)).padStart(2, '0')}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Track Number:</span>
                  <div className="text-gray-900 dark:text-white">
                    {song.track_number || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Popularity:</span>
                  <div className="text-gray-900 dark:text-white">
                    {song.popularity || 'N/A'}/100
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Explicit:</span>
                  <div className="text-gray-900 dark:text-white">
                    {song.explicit ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              {/* Preview player */}
              {song.preview_url && (
                <div className="mt-4">
                  <h4 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">Preview</h4>
                  <SpotifyPlayer src={song.preview_url} title={song.name} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}