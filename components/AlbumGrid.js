import { useState, useEffect } from 'react'
import SpotifyPlayer from './SpotifyPlayer'

export default function AlbumGrid({ albums = [], spotifyAlbums = [], onOpenAlbum }) {
  const [fetchedImages, setFetchedImages] = useState({})

  function handleOpenAlbum(a) {
    try { console.debug('AlbumGrid: open album', a && (a.id || a.name || a.title)) } catch (e) {}
    if (onOpenAlbum) onOpenAlbum(a)
  }

  useEffect(() => {
    let mounted = true
    async function fetchMissingImages() {
      for (const a of albums) {
        const key = a.id || (a.name || a.title || '')
        if (!key) continue
        if (fetchedImages[key]) continue
        const hasImage = (a.images && a.images[0] && a.images[0].url) || a.image
        if (hasImage) continue

        // Prefer a Spotify ID if present
        let spotifyId = null
        if (a.id && /^[A-Za-z0-9]{22}$/.test(a.id)) spotifyId = a.id

        // Fallback: find matching spotify album id by name
        if (!spotifyId) {
          const name = (a.name || a.title || '').toLowerCase()
          if (name) {
            for (const sa of spotifyAlbums) {
              if (!sa) continue
              const sname = (sa.name || '').toLowerCase()
              if (!sname) continue
              // exact or inclusive match
              if (sname === name || sname.includes(name) || name.includes(sname)) {
                if (sa.id && /^[A-Za-z0-9]{22}$/.test(sa.id)) {
                  spotifyId = sa.id
                  break
                }
              }
            }
          }
        }

        // If we still don't have a spotify id, try searching Spotify for the album name
        if (!spotifyId) {
          const q = encodeURIComponent(a.name || a.title || '')
          if (q) {
            try {
              const sr = await fetch(`/api/spotify/search?q=${q}&type=album&limit=1`)
              if (sr.ok) {
                const sj = await sr.json()
                const item = (sj.albums && sj.albums.items && sj.albums.items[0]) || null
                if (item && item.id && /^[A-Za-z0-9]{22}$/.test(item.id)) spotifyId = item.id
                if (item && item.images && item.images[0] && item.images[0].url) {
                  setFetchedImages(prev => ({ ...prev, [key]: item.images[0].url }))
                }
              }
            } catch (e) { /* ignore search errors */ }
          }
        }

        if (!spotifyId) continue

        try {
          const res = await fetch(`/api/spotify/album/${encodeURIComponent(spotifyId)}`)
          if (!res.ok) continue
          const j = await res.json()
          if (!mounted) return
          if (j && j.images && j.images[0] && j.images[0].url) {
            setFetchedImages(prev => ({ ...prev, [key]: j.images[0].url }))
          }
        } catch (e) {
          // ignore fetch errors
        }
      }
    }
    fetchMissingImages()
    return () => { mounted = false }
  }, [albums, spotifyAlbums, fetchedImages])

  function findMatchingImage(a) {
    // primary image from album object
    if (a.images && a.images[0] && a.images[0].url) return a.images[0].url
    if (a.image) return a.image

    const key = a.id || (a.name || a.title || '')
    if (key && fetchedImages[key]) return fetchedImages[key]

    const name = (a.name || a.title || '').toLowerCase()
    if (!name) return '/placeholder.svg'

    // try to find a matching spotify album by name
    for (const sa of spotifyAlbums) {
      if (!sa) continue
      const sname = (sa.name || '').toLowerCase()
      if (!sname) continue
      if (sname === name || sname.includes(name) || name.includes(sname)) {
        if (sa.images && sa.images[0] && sa.images[0].url) return sa.images[0].url
      }
    }

    return '/placeholder.svg'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {albums.map(a => {
        const name = a.name || a.title || 'Untitled'
        const img = findMatchingImage(a)
        const total = a.total_tracks || (a.tracks && a.tracks.length) || null
        const hasTracks = Array.isArray(a.tracks) && a.tracks.length > 0

        // determine if this is a recent release (within ~6 months)
        let isNew = false
        try {
          const d = a.release_date || a.first_release_date || a.date || null
          if (d) {
            let t = Date.parse(d)
            if (isNaN(t) && /^\d{4}$/.test(d)) t = Date.parse(`${d}-01-01`)
            if (!isNaN(t)) {
              const diff = Date.now() - t
              if (diff < (1000 * 60 * 60 * 24 * 30 * 6)) isNew = true
            }
          }
        } catch (e) { }

        const placeholder = img === '/placeholder.svg'

        return (
          <div key={a.id || name} className="bg-gradient-to-br from-white to-cyan-50/30 p-4 rounded-xl shadow-lg hover:shadow-xl transform-gpu transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 cursor-pointer animate-card-in focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 border border-cyan-200/30" role="button" tabIndex={0}
            onClick={() => handleOpenAlbum(a)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenAlbum(a) } }} aria-label={`Open album ${name}`}>
            <div className="flex flex-col">
              <div className="relative w-full rounded-xl overflow-hidden shadow-md">
                <img src={img} alt={name} className="w-full h-48 md:h-56 object-cover album-art" />

                {/* badges */}
                {isNew && <span className="absolute top-3 left-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">NEW</span>}
                {placeholder && <span className="absolute top-3 left-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">No art</span>}
                {total ? <span className="absolute top-3 right-3 bg-white/90 text-cyan-700 px-3 py-1 rounded-full text-xs font-medium shadow-md border border-cyan-200/50">{total} tracks</span> : null}
              </div>

              <div className="mt-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate whitespace-nowrap text-sm md:text-base text-cyan-800">{name}</div>
                  {a.artistName ? <div className="text-xs text-cyan-600 mt-1 truncate font-medium">{a.artistName}</div> : null}
                </div>
              </div>


            </div>
          </div>
        )
      })}
    </div>
  )
}
