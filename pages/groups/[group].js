import Layout from '../../components/Layout'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const GroupHero = dynamic(() => import('../../components/GroupHero'), { ssr: false })
import MemberModal from '../../components/MemberModal'
import AlbumModal from '../../components/AlbumModal'
import SpotifyAlbum from '../../components/SpotifyAlbum'
import AlbumGrid from '../../components/AlbumGrid'
import AdminRefresh from '../../components/AdminRefresh'
import SongGame from '../../components/SongGame'
import { getArtistEnrichment } from '../../lib/musicbrainz'
import { getEnrichment } from '../../lib/enrichment'
import fs from 'fs'
import path from 'path'

export default function Group({ group, initialEnrichment = null }) {
  const [tab, setTab] = useState('Albums')
  const [remote, setRemote] = useState(initialEnrichment)
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [showSongGameModal, setShowSongGameModal] = useState(false)

  useEffect(() => {
    try { if (selectedAlbum) console.debug('Group page: selectedAlbum changed', selectedAlbum && (selectedAlbum.id || selectedAlbum.name || selectedAlbum.title)) } catch (e) {}
  }, [selectedAlbum])
  const [isAdmin, setIsAdmin] = useState(false)
  const [liveGroup, setLiveGroup] = useState(null)
  const [albumDates, setAlbumDates] = useState({})

  // fetch fresh group record so updates to data/groups.json show without rebuilding
  useEffect(() => {
    let mounted = true
    async function fetchLive() {
      try {
        const r = await fetch(`/api/groups/${encodeURIComponent(group.id)}`)
        if (!r.ok) return
        const j = await r.json()
        if (mounted) setLiveGroup(j.group)
      } catch (e) {}
    }
    fetchLive()
    return () => { mounted = false }
  }, [group.id])

  useEffect(() => {
    // Only fetch on the client if we don't already have server-provided enrichment
    if (remote) return
    let mounted = true
    async function enrich() {
      try {
        setLoadingRemote(true)
        const r = await fetch(`/api/musicbrainz/artist?name=${encodeURIComponent(group.name)}`)
        if (!r.ok) return
        const j = await r.json()
        if (mounted) setRemote(j)
      } catch (err) {
        console.error('musicbrainz fetch error', err)
      } finally {
        if (mounted) setLoadingRemote(false)
      }
    }
    enrich()

    // check admin status
    let mountedAdmin = true
    async function checkAdmin() {
      try {
        const r = await fetch('/api/admin/status')
        const j = await r.json()
        if (mountedAdmin) setIsAdmin(!!j.admin)
      } catch (e) {}
    }
    checkAdmin()

    return () => { mounted = false; mountedAdmin = false }
  }, [group.name, remote])

  function normalizeTitle(t) {
    if (!t) return ''
    let s = String(t).trim().toLowerCase()
    // remove parenthetical content
    s = s.replace(/\(.*?\)/g, '')
    // remove common album descriptors and ordinals
    s = s.replace(/\b(the|album|mini album|mini|ep|single|deluxe|repackage|re-?package|version|ver|edition|limited|track by track|soundtrack)\b/g, '')
    s = s.replace(/\b\d+(st|nd|rd|th)\b/g, '')
    // remove language/version tags like jp, en, japanese, english
    s = s.replace(/\b(jp|jp ver|jp version|japanese|en|en ver|english)\b/g, '')
    // remove punctuation/quotes
    s = s.replace(/[\u2018\u2019\u201c\u201d\'\"\,\:\.\!\?\-\’\“\”]/g, '')
    s = s.replace(/\s+/g, ' ').trim()
    return s
  }

  function albumScore(a) {
    let score = 0
    if (!a) return score
    // prefer Spotify ids
    if (a.id && /^[A-Za-z0-9]{22}$/.test(a.id)) score += 50
    if (a.spotify_id && /^[A-Za-z0-9]{22}$/.test(a.spotify_id)) score += 40
    if (a.images && a.images.length) score += 6
    if (a.image) score += 4
    if (a.release_date || a.first_release_date || a.date || a.year) score += 3
    return score
  }

  function trackKey(a) {
    try {
      const tracks = (a.tracks && a.tracks.map(t => (typeof t === 'string' ? t : (t.name || '')))) || []
      if (!tracks.length) return null
      const normalized = tracks.map(t => String(t || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()).join('|')
      return normalized || null
    } catch (e) { return null }
  }

  function mergeAlbums() {
    const lists = []
    if (remote && Array.isArray(remote.albums) && remote.albums.length) lists.push(...remote.albums)
    if (Array.isArray(group.albums) && group.albums.length) lists.push(...group.albums)
    if (group.spotify && Array.isArray(group.spotify.albums) && group.spotify.albums.length) lists.push(...group.spotify.albums)
    if (liveGroup && liveGroup.spotify && Array.isArray(liveGroup.spotify.albums) && liveGroup.spotify.albums.length) lists.push(...liveGroup.spotify.albums)

    const byId = new Map()
    const byTitle = new Map()
    const byTrack = new Map()

    for (const a of lists) {
      if (!a) continue
      const id = (a.id && typeof a.id === 'string') ? a.id : null
      const title = a.name || a.title || ''
      const titleKey = normalizeTitle(title) || null
      const tKey = trackKey(a)

      // Deduplicate by exact id
      if (id) {
        if (!byId.has(id)) byId.set(id, a)
        else {
          const existing = byId.get(id)
          if (albumScore(a) > albumScore(existing)) byId.set(id, a)
        }
      }

      // Deduplicate by identical track listing
      if (tKey) {
        if (!byTrack.has(tKey)) byTrack.set(tKey, a)
        else {
          const existing = byTrack.get(tKey)
          if (albumScore(a) > albumScore(existing)) byTrack.set(tKey, a)
        }
      }

      // Deduplicate by normalized title
      if (titleKey) {
        if (!byTitle.has(titleKey)) byTitle.set(titleKey, a)
        else {
          const existing = byTitle.get(titleKey)
          if (albumScore(a) > albumScore(existing)) byTitle.set(titleKey, a)
        }
      }

      if (!id && !titleKey && !tKey) {
        const uniq = `__anon__${Math.random().toString(36).slice(2,9)}`
        byTitle.set(uniq, a)
      }
    }

    // Combine unique albums: prefer id matches, then track matches, then title matches
    const out = []
    const seen = new Set()

    for (const [id, a] of byId.entries()) {
      out.push(a)
      if (id) seen.add(id)
      const nk = normalizeTitle(a.name || a.title || '')
      if (nk) seen.add(nk)
      const tk = trackKey(a)
      if (tk) seen.add(tk)
    }

    for (const [tk, a] of byTrack.entries()) {
      const id = (a.id && typeof a.id === 'string') ? a.id : null
      const nk = normalizeTitle(a.name || a.title || '')
      if (id && seen.has(id)) continue
      if (nk && seen.has(nk)) continue
      if (tk && seen.has(tk)) continue
      out.push(a)
      if (id) seen.add(id)
      if (nk) seen.add(nk)
      if (tk) seen.add(tk)
    }

    for (const [nk, a] of byTitle.entries()) {
      const id = (a.id && typeof a.id === 'string') ? a.id : null
      const tk = trackKey(a)
      if (id && seen.has(id)) continue
      if (nk && seen.has(nk)) continue
      if (tk && seen.has(tk)) continue
      out.push(a)
      if (id) seen.add(id)
      if (nk) seen.add(nk)
      if (tk) seen.add(tk)
    }

    return out
  }

  const merged = {
    ...group,
    // Prefer a live group record when available (matches the HeroCarousel's source), then the local group description,
    // then any remote enrichment. This makes the group page text match what the carousel shows.
    description: (liveGroup && liveGroup.description) || group.description || (remote && remote.description) || '',
    image: (liveGroup && liveGroup.image) || (remote && remote.image) || group.image || (group.members && group.members[0] && group.members[0].image) || '/placeholder.svg',
    albums: mergeAlbums(),

    songs: (remote && remote.songs && remote.songs.length ? remote.songs : group.songs || []),
    musicbrainz: remote || null
  }

  function getTimestamp(a) {
    if (!a) return null
    // prefer fetched albumDates map when present
    if (a && a.id && albumDates && albumDates[a.id]) {
      const d = albumDates[a.id]
      if (d && /^\d{4}$/.test(d)) return new Date(`${d}-01-01`).getTime()
      const t = Date.parse(d)
      if (!isNaN(t)) return t
    }
    // Spotify: release_date + release_date_precision
    if (a.release_date) {
      const p = a.release_date_precision || ''
      const d = a.release_date
      if (p === 'year' && /^\d{4}$/.test(d)) return new Date(`${d}-01-01`).getTime()
      if (p === 'month' && /^\d{4}-\d{2}$/.test(d)) return new Date(`${d}-01`).getTime()
      // otherwise try full parse
      const t = Date.parse(d)
      if (!isNaN(t)) return t
    }

    // MusicBrainz style
    if (a.first_release_date) {
      const d = a.first_release_date
      if (/^\d{4}$/.test(d)) return new Date(`${d}-01-01`).getTime()
      const t = Date.parse(d)
      if (!isNaN(t)) return t
    }

    // generic fields
    if (a.date) {
      const d = a.date
      if (/^\d{4}$/.test(d)) return new Date(`${d}-01-01`).getTime()
      const t = Date.parse(d)
      if (!isNaN(t)) return t
    }

    if (a.year && /^\d{4}$/.test(String(a.year))) return new Date(`${a.year}-01-01`).getTime()

    return null
  }

  // Fetch missing album release_date values from Spotify for sorting (only for albums that have tracks)
  useEffect(() => {
    let mounted = true
    async function fetchMissingDates() {
      if (!merged.albums || merged.albums.length === 0) return
      // only consider albums that actually have a track listing or a known total_tracks
      const hasTracks = a => (Array.isArray(a.tracks) && a.tracks.length > 0) || (a.total_tracks && a.total_tracks > 0)
      const toFetch = merged.albums.filter(a => a && a.id && hasTracks(a) && !getTimestamp(a))
      if (toFetch.length === 0) return
      const map = { ...albumDates }
      for (const a of toFetch) {
        try {
          const raw = String(a.id).split('?')[0]
          let normalized = null
          if (/^[A-Za-z0-9]{22}$/.test(raw)) normalized = raw
          else {
            const m = raw.match(/(?:spotify:album:|open\.spotify\.com\/album\/)([A-Za-z0-9]{22})/)
            if (m) normalized = m[1]
          }
          if (!normalized) continue

          const r = await fetch(`/api/spotify/album/${encodeURIComponent(normalized)}`)
          if (!r.ok) continue
          const j = await r.json()
          if (j && j.release_date) {
            map[a.id] = j.release_date
            if (normalized !== a.id) map[normalized] = j.release_date
          }
        } catch (e) {}
      }
      if (mounted) setAlbumDates(map)
    }
    fetchMissingDates()
    return () => { mounted = false }
  }, [merged.albums])

  // Determine a preview Spotify album id (must be a Spotify album id, not a MusicBrainz UUID)
  function findSpotifyAlbumId() {
    // explicit preview id on group (must be a 22-char Spotify id)
    if (group.spotify_album_id && /^[A-Za-z0-9]{22}$/.test(group.spotify_album_id)) return group.spotify_album_id

    // check a few possible album lists in order of preference
    const lists = [
      (liveGroup && liveGroup.spotify && liveGroup.spotify.albums) || [],
      (group.spotify && group.spotify.albums) || [],
      (merged && merged.albums) || []
    ]

    for (const arr of lists) {
      for (const a of arr) {
        if (!a) continue
        const id = a.id || a.spotify_id || a.albumId || ''
        if (typeof id === 'string') {
          const normalized = id.split('?')[0]
          if (/^[A-Za-z0-9]{22}$/.test(normalized)) return normalized
          const urlMatch = normalized.match(/(?:spotify:album:|open\.spotify\.com\/album\/)([A-Za-z0-9]{22})/)
          if (urlMatch) return urlMatch[1]
        }
      }
    }
    return null
  }

  const previewAlbumId = findSpotifyAlbumId()

  const [tabVisible, setTabVisible] = useState(true)
  useEffect(() => {
    // trigger small entrance animation when tab changes
    setTabVisible(false)
    const t = setTimeout(() => setTabVisible(true), 24)
    return () => clearTimeout(t)
  }, [tab])

  if (!group) return <Layout><p>Group not found</p></Layout>
  return (
    <Layout title={`${group.name} - k-taby`}>
      <GroupHero
        title={merged.name}
        description={merged.description || ''}
        image={merged.image}
        logo={merged.logo || merged.image}
        youtubeChannel={group.youtube_channel}
        youtubeVideoId={group.youtube_video_id}
      />



      <div className="max-w-5xl mx-auto px-4 pt-6 pb-8 relative">
        {/* Tabs (placed below hero) */}
        <div className="flex gap-3 mb-6 relative z-40 p-2 rounded items-center justify-between">
          <div className="flex items-center">
            <div className="tab-bar">
              <div className={`tab-indicator ${tab === 'Members' ? 'move-right' : ''}`} />
              <div className="relative z-10 flex">
                {['Albums','Members'].map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`tab-btn ${tab === t ? 'active' : ''}`}
                    aria-pressed={tab === t}
                    aria-label={`Show ${t}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Song Game Button */}
          <button
            onClick={() => setShowSongGameModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                     text-white font-bold py-2 px-4 rounded-full shadow-lg 
                     transform hover:scale-105 transition-all duration-200 
                     flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Song Game
          </button>
        </div>



        {tab === 'Albums' && (
          <section className={`tab-panel ${tabVisible ? 'enter' : 'leave'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold mb-2">Albums</h2>
              {isAdmin ? <AdminRefresh groupId={group.id} /> : null}
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Song search coming soon..."
                disabled
                className="w-full p-2 border border-gray-300 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            {merged.albums && merged.albums.length > 0 ? (
              (() => {
                // filter out albums with no track listing
                const albumsWithTracks = [...merged.albums].filter(a => {
                  if (!a) return false
                  if (Array.isArray(a.tracks) && a.tracks.length > 0) return true
                  if (a.total_tracks && a.total_tracks > 0) return true
                  return false
                })

                const sorted = albumsWithTracks.filter(Boolean).sort((x,y)=>{
                  const dx = getTimestamp(x)
                  const dy = getTimestamp(y)
                  if (dx === null && dy === null) {
                    const nx = (x.name || x.title || '').toLowerCase()
                    const ny = (y.name || y.title || '').toLowerCase()
                    return nx.localeCompare(ny)
                  }
                  if (dx === null) return 1 // null (no date) goes last
                  if (dy === null) return -1
                  return dy - dx // descending: newest first
                })

                if (!sorted || sorted.length === 0) return (loadingRemote ? <p className="text-gray-600">Loading albums…</p> : <p className="text-gray-600">No albums with track listings.</p>)

                return (
                  <AlbumGrid
                    albums={sorted}
                    spotifyAlbums={(liveGroup && liveGroup.spotify && liveGroup.spotify.albums) || (group.spotify && group.spotify.albums) || []}
                    onOpenAlbum={(a)=>{ try { console.debug('Group page: open album', a && (a.id || a.name || a.title)) } catch(e){}; setSelectedAlbum(a) }}
                  />
                )
              })()
            ) : (
              loadingRemote ? <p className="text-gray-600">Loading albums…</p> : <p className="text-gray-600">No albums listed.</p>
            )}
          </section>
        )}



        {tab === 'Members' && (
          <section className={`tab-panel ${tabVisible ? 'enter' : 'leave'}`}>
            <h2 className="text-xl font-semibold mb-4">Members</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {group.members.length === 0 && <p className="text-gray-600">No members added yet. Run the member fetch script to populate bios and photos.</p>}
              {group.members.map(m => (
                <div key={m.id || m.name} className="card-surface p-3 transform-gpu transition-all duration-300 ease-out card-press cursor-pointer animate-card-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ktaby-500/30 dark:bg-gray-800 dark:border-gray-700" role="button" tabIndex={0} onClick={() => setSelectedMember(m)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMember(m) } }}>
                  <a href={`/groups/${group.id}/${m.id || encodeURIComponent(m.name)}`} onClick={(e) => { e.preventDefault(); setSelectedMember(m) }} className="block w-full relative rounded mb-2 overflow-hidden pb-[100%] group cursor-pointer" aria-label={`Open profile for ${m.name}`}>
                    <Image src={(() => { try { const { normalizeImage } = require('../../lib/images'); return normalizeImage?(normalizeImage(m.image)||'/placeholder.svg'):'/placeholder.svg' } catch(e){ return '/placeholder.svg' } })()} alt={m.name} fill className="object-cover object-top transition-transform duration-200 group-hover:scale-105" />
                  </a>

                  <h4 className="font-semibold mt-2 dark:text-white">{m.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{m.role || ''}</p>
                  <button type="button" onClick={() => setSelectedMember(m)} className="btn btn-ktaby btn-sm btn-pill btn-animated mt-3 w-full sm:w-auto">Profile →</button>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
      {selectedMember && <MemberModal member={selectedMember} groupId={group.id} onClose={() => setSelectedMember(null)} />}
      {selectedAlbum && <AlbumModal album={selectedAlbum} spotifyAlbums={(liveGroup && liveGroup.spotify && liveGroup.spotify.albums) || (group.spotify && group.spotify.albums) || []} onClose={() => setSelectedAlbum(null)} />}
      
      {/* Song Game Modal */}
      {showSongGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] sm:h-[90vh] md:h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 pr-2">
                🎵 {group.name} - Song Game
              </h2>
              <button
                onClick={() => setShowSongGameModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <SongGame albums={merged.albums} groupName={group.name} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export async function getStaticPaths() {
  const dataPath = path.resolve(process.cwd(), 'data', 'groups.json')
  const groups = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const paths = groups.map(g => ({ params: { group: g.id }}))
  // Generate all group pages at build time and do not fall back to client-side rendering
  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  const dataPath = path.resolve(process.cwd(), 'data', 'groups.json')
  const groups = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const group = groups.find(g => g.id === params.group) || null
  if (!group) return { notFound: true }

  // detect simple country hint from description (if present)
  let countryHint = null
  const desc = (group.description || '').toLowerCase()
  if (desc.includes('south korean') || desc.includes('korean')) countryHint = 'KR'
  else if (desc.includes('japanese') || desc.includes('japan')) countryHint = 'JP'
  else if (desc.includes('american') || desc.includes('united states') || desc.includes('u.s.')) countryHint = 'US'

  // Enrich at build-time so albums/songs and description are available on the server
  let enrichment = null
  try {
    enrichment = await getEnrichment(group.name, { country: countryHint, mbid: group.mbid })
  } catch (err) {
    console.error('enrichment failed in getStaticProps', err)
    enrichment = null
  }

  return { props: { group, initialEnrichment: enrichment } }
}
