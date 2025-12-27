import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
const groups = require('../data/groups.json')
import { normalizeImage } from '../lib/images'

export default function HeroCarousel({ interval = 4000, externalIndex, onIndexChange, externalPaused, onPause }) {
  // If externalIndex is provided, operate in controlled mode. Otherwise use internal state.
  const [internalIndex, setInternalIndex] = useState(0)
  const index = typeof externalIndex === 'number' ? externalIndex : internalIndex
  const setIndex = (i) => { if (onIndexChange) onIndexChange(i); else setInternalIndex(i) }

  const [internalPaused, setInternalPaused] = useState(false)
  const paused = typeof externalPaused === 'boolean' ? externalPaused : internalPaused
  const setPaused = (p) => { if (onPause) onPause(p); else setInternalPaused(p) }

  const timer = useRef(null)

  // sliding indicator measurement
  const dotsRef = useRef(null)
  const [indicatorLeft, setIndicatorLeft] = useState(0)
  const [indicatorSize, setIndicatorSize] = useState(8)

  // live group cache to mirror the group page "merged" description/data
  const [liveGroups, setLiveGroups] = useState({})

  useLayoutEffect(() => {
    function update() {
      const container = dotsRef.current
      if (!container) return
      const buttons = container.querySelectorAll('button')
      const btn = buttons[index]
      if (!btn) return
      const left = btn.offsetLeft + (btn.offsetWidth / 2) - (btn.offsetWidth / 2)
      setIndicatorLeft(left)
      setIndicatorSize(btn.offsetWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [index, groups.length])

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => {
      setIndex(i => ( (typeof i === 'number' ? i : index) + 1) % groups.length)
    }, interval)
    return () => clearInterval(timer.current)
  }, [paused, interval, index])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % groups.length)
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + groups.length) % groups.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fetch the live/merged group record for the currently visible slide so the carousel
  // shows the same description/content as the group pages (uses /api/groups/[id]).
  useEffect(() => {
    let mounted = true
    const id = groups[index] && groups[index].id
    if (!id) return
    // avoid refetch if we already have it
    if (liveGroups[id]) return

    const controller = new AbortController()
    async function fetchLive() {
      try {
        const r = await fetch(`/api/groups/${encodeURIComponent(id)}`, { signal: controller.signal })
        if (!r.ok) return
        const j = await r.json()
        if (mounted && j && j.group) setLiveGroups(prev => ({ ...prev, [id]: j.group }))
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Failed fetching live group for carousel', e)
      }
    }
    fetchLive()
    return () => { mounted = false; controller.abort() }
  }, [index, liveGroups, groups])

  if (!groups || groups.length === 0) return null
  const g = groups[index]

  return (
    <section className="relative left-1/2 -translate-x-1/2 w-screen h-64 sm:h-72 md:h-96 -mt-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Slides: stacked absolutely with fade transition */}
      <div className="absolute inset-0 -z-10">
        {groups.map((gg, idx) => {
          const slideBg = normalizeImage(gg.image) || '/placeholder.svg'
          const isActive = idx === index
          // Use explicit per-group heroPosition if provided, default to 'top center' (show top, crop bottom)
          const objectPos = (gg.heroPosition === 'bottom') ? 'bottom center' : 'top center'
          // Allow an optional top-crop percentage to shift the image upward so the top is cropped and view starts lower
          const cropPercentRaw = typeof gg.heroCropTopPercent === 'number' ? gg.heroCropTopPercent : 0
          // Cap crop to a sensible maximum and ensure a small non-zero value behaves predictably
          const cropPercent = Math.max(0, Math.min(12, cropPercentRaw))
          const translateStyle = cropPercent ? { transform: `translateY(-${cropPercent}%)` } : {}
          return (
            <div key={gg.id} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'} ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isActive}>
              {gg.heroLayout === 'collage' && Array.isArray(gg.members) ? (
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  {gg.members.slice(0, 4).map((m, i) => {
                    const mimg = normalizeImage(m.image) || slideBg
                    return (
                      <div key={i} className="relative w-full h-full overflow-hidden">
                        <Image key={mimg} src={mimg} alt={`${gg.name} member`} fill className="object-cover" style={{ objectPosition: objectPos, ...translateStyle }} priority={isActive && i === 0} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="absolute inset-0 overflow-hidden">
                  <Image key={slideBg} src={slideBg} alt={gg.name} fill className="object-cover" style={{ objectPosition: objectPos, ...translateStyle }} priority={isActive} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="absolute inset-0 z-20 flex items-center">
        <div className="max-w-5xl mx-auto px-4 w-full flex items-center justify-between">
          <div>
            <h2 className="text-white text-2xl md:text-4xl font-bold drop-shadow">{g.name}</h2>
            {/* Show the "merged"/live description when available so the carousel matches group pages. Clamp to 3 lines. */}
            {(() => {
              const live = liveGroups[g.id] || null
              const descHtml = (live && live.description) || g.description || ''
              return (
                <p className="mt-2 text-white/90 max-w-xl" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: descHtml }} />
              )
            })()}

            <Link href={`/groups/${g.id}`} className="inline-block mt-4 bg-ktaby-500 text-white px-4 py-2 rounded">Learn more about {g.name}</Link>
          </div>

          {/* bottom center controls (desktop & mobile) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
            <button aria-label="Prev" onClick={() => setIndex(i => (i - 1 + groups.length) % groups.length) || setPaused(true)} className="bg-white/20 hover:bg-white/30 text-white rounded-full w-9 h-9 flex items-center justify-center">‹</button>

            <div className="relative">
              <div ref={dotsRef} className="flex gap-2 items-center px-2">
                {groups.map((gg, idx) => (
                  <button key={gg.id} onClick={() => { setIndex(idx); setPaused(true) }} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === index ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`} aria-label={`Go to ${gg.name}`} />
                ))}
              </div>
              {/* sliding active indicator (positioned via measurement) */}
              <div aria-hidden="true" className="absolute bg-white rounded-full transition-all duration-300" style={{ left: `${indicatorLeft}px`, top: '50%', width: `${Math.max(6, indicatorSize)}px`, height: `${Math.max(6, indicatorSize)}px`, transform: 'translateY(-50%)' }} />
            </div>

            <button aria-label="Next" onClick={() => setIndex(i => (i + 1) % groups.length) || setPaused(true)} className="bg-white/20 hover:bg-white/30 text-white rounded-full w-9 h-9 flex items-center justify-center">›</button>
          </div>
        </div>
      </div>



      {/* bottom fade — minimal and near-invisible */}
      <div className="absolute bottom-0 left-0 w-full h-6 z-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(243,244,246,0.08) 10%, var(--page-bg) 100%)' }} />

      {/* tiny blurred edge — very subtle blend */}
      <div className="absolute bottom-0 left-0 w-full h-2 z-10 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(243,244,246,0.0), var(--page-bg))', filter: 'blur(1px)', opacity: 0.5 }} />
    </section>
  )
}