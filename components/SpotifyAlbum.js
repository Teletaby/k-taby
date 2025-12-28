import { useEffect, useState } from 'react'
import SpotifyPlayer from './SpotifyPlayer'

export default function SpotifyAlbum({ albumId, noImage = false }) {
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!albumId) return
    setLoading(true)
    setErr(null)
    fetch(`/api/spotify/album/${encodeURIComponent(albumId)}`).then(r => r.json()).then(j => {
      if (j.error) setErr(j.error)
      else setAlbum(j)
    }).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [albumId, noImage])

  if (!albumId) return null
  if (loading) return <div>Loading album…</div>
  if (err) return <div className="text-red-500">{err}</div>
  if (!album) return null

  return (
    <div className={"rounded-xl p-4 bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 shadow-lg " + (noImage ? 'bg-gradient-to-br from-pink-50 to-purple-50 shadow-none border border-pink-200' : 'bg-white shadow-lg')}>
      {noImage ? (
        <div>
          <h3 className="text-lg font-bold mb-1">{album.name}</h3>
          <div className="text-sm text-gray-600 mb-2">{album.artists.map(a=>a.name).join(', ')}</div>

          <div className="mt-2 space-y-3">
            {album.tracks.map(t => (
              <div key={t.id || `${t.track_number}-${t.name}`} className="p-3 rounded-lg bg-white/70 border border-pink-100 hover:border-purple-200 transition-colors duration-200">
                <div className="text-sm font-medium text-gray-800 break-words mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gradient-to-br from-pink-400 to-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {t.track_number}
                  </span>
                  {t.name}
                </div>
                {t.id ? (
                  <div className="spotify-embed-wrap">
                    <iframe className="spotify-embed large" src={'https://open.spotify.com/embed/track/' + t.id} frameBorder="0" allow="encrypted-media; autoplay; clipboard-write" />
                    <div className="mt-2 text-right">
                      <a href={'https://open.spotify.com/track/' + t.id} target="_blank" rel="noreferrer" className="text-sm text-ktaby-500 underline">Open in Spotify</a>
                    </div>
                  </div>
                ) : t.preview_url ? (
                  <SpotifyPlayer src={t.preview_url} title={t.name} />
                ) : (
                  <div className="text-sm text-gray-400">Preview not available</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          <img src={(album.images && album.images[0] && album.images[0].url) || '/placeholder.svg'} alt={album.name} className="w-36 h-36 object-cover rounded" />
          <div>
            <h3 className="text-lg font-bold">{album.name}</h3>
            <div className="text-sm text-gray-600">{album.artists.map(a=>a.name).join(', ')}</div>

            <div className="mt-4 space-y-2">
              {album.tracks.map(t => (
                <div key={t.id || `${t.track_number}-${t.name}`} className="p-2 border rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">{t.track_number}. {t.name}</div>
                    <div className="w-full md:w-56">
                      {t.preview_url ? (
                        <SpotifyPlayer src={t.preview_url} title={t.name} />
                      ) : (t.id ? (
                        <div className="w-full spotify-embed-wrap">
                          <iframe className="spotify-embed" src={'https://open.spotify.com/embed/track/' + t.id} frameBorder="0" allow="encrypted-media; autoplay; clipboard-write" />
                          <div className="mt-2 text-right">
                            <a href={'https://open.spotify.com/track/' + t.id} target="_blank" rel="noreferrer" className="text-sm text-ktaby-500 underline">Open in Spotify</a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Preview not available</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
