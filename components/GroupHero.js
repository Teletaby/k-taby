import { useEffect, useState } from 'react'
import Image from 'next/image'

import { normalizeImage } from '../lib/images'

export default function GroupHero({ title, description, image, logo, youtubeChannel, youtubeVideoId }) {
  const [videoId, setVideoId] = useState(null)
  const [showVideo, setShowVideo] = useState(false)
  const bgImage = normalizeImage(image) || '/placeholder.svg'
  const logoImage = normalizeImage(logo) || '/placeholder.svg'

  useEffect(() => {
    let mounted = true
    async function fetchRandom() {
      try {
        if (youtubeVideoId) {
          setVideoId(youtubeVideoId)
          setTimeout(() => { if (mounted) setShowVideo(true) }, 700)
          return
        }
        if (!youtubeChannel) return
        const url = `/api/youtube/random?channel=${encodeURIComponent(youtubeChannel)}`
        const r = await fetch(url)
        if (!r.ok) return
        const j = await r.json()
        if (j.id && mounted) {
          setVideoId(j.id)
          setTimeout(() => { if (mounted) setShowVideo(true) }, 700)
        }
      } catch (err) {
        console.error('youtube fetch error', err)
      }
    }
    fetchRandom()
    return () => { mounted = false }
  }, [youtubeChannel, youtubeVideoId])

  const embedSrc = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?start=10&autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=${videoId}` : null

  return (
    <header className="relative left-1/2 -translate-x-1/2 w-screen h-64 md:h-[440px] -mt-4 overflow-hidden">
      {/* overlay tint for k-pop vibe */}
      <div className="kpop-hero-overlay" />
      {/* background image (furthest back) */}
      <div className="absolute inset-0 -z-30 bg-gray-800" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'top center' }}>
        <Image src={bgImage} alt={title} fill priority className={`object-cover object-top md:object-bottom hero-crop-bottom-md hero-crop-bottom w-full h-full transition-transform duration-700 ${showVideo ? 'scale-150 blur-sm' : 'scale-125'}`} />
      </div>

      {/* youtube iframe (behind content, non-interactive, full-bleed) */}
      {embedSrc && (
        <div className={`absolute inset-0 -z-20 pointer-events-none transition-opacity duration-700 ${showVideo ? 'opacity-100' : 'opacity-0'}`}>
          {/* center the iframe and scale it so it always covers the hero fully */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '260%', height: '260%' }}>
            <iframe
              src={embedSrc}
              title={`Video for ${title}`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              className="w-full h-full"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
      )}

      {/* subtle dark overlay to improve legibility (lighter) */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-transparent" />

      {/* bottom fade — minimal and near-invisible to match homepage */}
      <div className="absolute bottom-0 left-0 w-full h-6 z-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(243,244,246,0.08) 10%, var(--page-bg) 100%)' }} />

      {/* tiny blurred edge — very subtle blend */}
      <div className="absolute bottom-0 left-0 w-full h-2 z-10 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(243,244,246,0.0), var(--page-bg))', filter: 'blur(1px)', opacity: 0.5 }} />



      {/* subtle play button (center) */}
      {embedSrc && !showVideo && (
        <button onClick={() => setShowVideo(true)} aria-label="Play preview" className="absolute z-40 left-1/2 -translate-x-1/2 bottom-6 md:bottom-10 bg-white/90 p-3 rounded-full shadow-lg hover:scale-105 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" viewBox="0 0 20 20" fill="currentColor"><path d="M6.5 5.5v9l7-4.5-7-4.5z" /></svg>
        </button>
      )}

      {/* title & description (top) with inline logo */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 py-8 md:py-20 text-white">
        <div className="flex items-start gap-4">
          {logo && (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-white/40 shadow-lg flex-shrink-0">
              <Image src={logoImage} alt={`${title} logo`} width={96} height={96} priority className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold drop-shadow">{title}</h1>
            {description && <p className="mt-2 md:mt-3 text-sm md:text-lg text-white/85 max-w-3xl" dangerouslySetInnerHTML={{ __html: description }} />}
          </div>
        </div>
      </div>
    </header>
  )
}
