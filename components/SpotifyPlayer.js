import { useEffect, useState } from 'react'

// Shared audio controller so only one preview plays at a time
let sharedAudio = null
let sharedSrc = null
let subscribers = new Set()

function ensureAudio(src) {
  if (!src) return
  if (!sharedAudio || sharedSrc !== src) {
    if (sharedAudio) {
      try { sharedAudio.pause() } catch (e) {}
      sharedAudio.src = ''
    }
    sharedAudio = new Audio(src)
    sharedSrc = src
    sharedAudio.addEventListener('timeupdate', () => {
      for (const s of subscribers) s({ type: 'time', time: sharedAudio.currentTime })
    })
    sharedAudio.addEventListener('ended', () => {
      for (const s of subscribers) s({ type: 'ended' })
      sharedSrc = null
    })
  }
}

export function pausePreview() {
  if (sharedAudio) {
    try { sharedAudio.pause() } catch (e) {}
  }
}

export default function SpotifyPlayer({ src, title }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function handler(ev) {
      if (ev.type === 'time') setProgress(ev.time || 0)
      if (ev.type === 'ended') setPlaying(false)
    }
    subscribers.add(handler)
    return () => { subscribers.delete(handler) }
  }, [])

  useEffect(() => {
    // reflect global state: if something else started playing, stop this player's button state
    if (!src) return
    if (sharedSrc && sharedSrc !== src) setPlaying(false)
  }, [src])

  function toggle() {
    if (!src) return
    if (playing) {
      // pause shared
      pausePreview()
      setPlaying(false)
    } else {
      // start shared audio at this src
      ensureAudio(src)
      if (sharedAudio) {
        sharedAudio.play().catch(() => {})
        setPlaying(true)
      }
      // notify other subscribers (they'll set playing false if src differs)
      for (const s of subscribers) s({ type: 'play', src })
    }
  }

  // subscribe to play events to update playing state
  useEffect(() => {
    function p(ev) {
      if (ev.type === 'play') {
        if (ev.src !== src) setPlaying(false)
      }
    }
    subscribers.add(p)
    return () => subscribers.delete(p)
  }, [src])

  if (!src) return null

  const pct = Math.min(1, progress / 30 || 0)

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 w-full">
        <button onClick={toggle} className={
          `btn btn-kpop-play btn-animated flex items-center justify-center gap-2 w-full sm:w-auto py-3 px-4 sm:py-2 rounded-full text-base sm:text-sm font-semibold transition-all duration-200 ${
            playing 
              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/25' 
              : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/25'
          } text-white shadow-lg border-2 border-white/20`
        } aria-label={playing ? `Pause ${title}` : `Play ${title}`}>
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="4" height="16" fill="currentColor" rx="2"/>
              <rect x="14" y="4" width="4" height="16" fill="currentColor" rx="2"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
            </svg>
          )}
          <span className="hidden sm:inline">{playing ? 'Pause' : 'Play'}</span>
        </button>

        <div className="ml-2 text-sm flex-1">
          <div className="font-medium break-words text-gray-800">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{Math.round(progress)}s</div>
        </div>
      </div>

      <div className="mt-2 h-2 rounded bg-gray-200 overflow-hidden">
        <div className="h-full bg-ktaby-500" style={{ width: `${Math.round(pct*100)}%` }} />
      </div>
    </div>
  )
}
