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
    <div className={"rounded p-4 " + (noImage ? 'bg-gray-50 shadow-none border' : 'bg-white shadow') }>
      {noImage ? (
        <div>
          <h3 className="text-lg font-bold mb-1">{album.name}</h3>
          <div className="text-sm text-gray-600 mb-2">{album.artists.map(a=>a.name).join(', ')}</div>

          <div className="mt-2 space-y-3">
            {album.tracks.map(t => (
              <div key={t.id || `${t.track_number}-${t.name}`} className="p-3 rounded border">
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-gray-800 truncate">{t.track_number}. {t.name}</div>
                  <div>
                    {t.preview_url ? (
                      <SpotifyPlayer src={t.preview_url} title={t.name} />
                    ) : (t.id ? (
                      <div className="w-full">
                        <iframe className="spotify-embed large" src={'https://open.spotify.com/embed/track/' + t.id} frameBorder="0" allow="encrypted-media; autoplay; clipboard-write" />
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
                    <div className="sm:w-48">
                      {t.preview_url ? (
                        <SpotifyPlayer src={t.preview_url} title={t.name} />
                      ) : (t.id ? (
                        <div className="w-full">
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
