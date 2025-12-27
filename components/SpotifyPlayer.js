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

  if (!src) return <div className="text-sm text-gray-400">Preview not available</div>

  return (
    <div className="flex items-center gap-3 w-full">
      <button onClick={toggle} className="btn btn-primary">{playing ? 'Pause' : 'Play'}</button>
      <div className="text-sm truncate">{title}</div>
      <div className="ml-auto text-xs text-gray-500">{Math.round(progress)}s</div>
    </div>
  )
}
