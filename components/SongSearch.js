import { useState, useEffect, useRef } from 'react'
import SongModal from './SongModal'

export default function SongSearch({ groupName = '', groupMembers = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Function to check if a song belongs to the group
  function isGroupSong(song) {
    if (!song) return false
    
    const trackArtists = song.artists || []
    const trackArtistNames = trackArtists.map(a => (a.name || a || '').toLowerCase().trim()).filter(Boolean)
    
    // If no artists found on song, don't show it
    if (trackArtistNames.length === 0) {
      return false
    }
    
    // Check if group name is in any artist (more flexible matching)
    const groupNameLower = (groupName || '').toLowerCase().trim()
    const groupNameNormalized = groupNameLower.replace(/[^a-z0-9]/g, '')
    
    if (groupNameLower && trackArtistNames.some(name => {
      const artistLower = name.toLowerCase()
      const artistNormalized = artistLower.replace(/[^a-z0-9]/g, '')
      
      // Exact match
      if (artistLower === groupNameLower) return true
      
      // Contains match (either direction)
      if (artistLower.includes(groupNameLower) || groupNameLower.includes(artistLower)) return true
      
      // Normalized match (remove special chars)
      if (artistNormalized === groupNameNormalized) return true
      
      // Common variations (e.g., NewJeans vs New Jeans)
      const variations = [
        groupNameNormalized,
        groupNameNormalized.replace(/newjeans/, 'new jeans'),
        groupNameNormalized.replace(/new jeans/, 'newjeans'),
        groupNameNormalized.replace(/bts/, 'bangtan sonyeondan'),
        groupNameNormalized.replace(/bangtan sonyeondan/, 'bts'),
        groupNameNormalized.replace(/blackpink/, 'black pink'),
        groupNameNormalized.replace(/black pink/, 'blackpink'),
      ]
      
      return variations.some(variation => artistNormalized.includes(variation) || variation.includes(artistNormalized))
    })) {
      return true
    }
    
    // Check if any member name is in any artist
    if (groupMembers && groupMembers.length > 0) {
      const hasMember = groupMembers.some(member => {
        const memberName = (member.name || '').toLowerCase().trim()
        const memberNormalized = memberName.replace(/[^a-z0-9]/g, '')
        if (!memberName) return false
        
        return trackArtistNames.some(artistName => {
          const artistLower = artistName.toLowerCase()
          const artistNormalized = artistLower.replace(/[^a-z0-9]/g, '')
          
          // Exact match
          if (artistLower === memberName) return true
          
          // Contains match
          if (artistLower.includes(memberName) || memberName.includes(artistLower)) return true
          
          // Normalized match
          if (artistNormalized === memberNormalized) return true
          
          return false
        })
      })
      if (hasMember) return true
    }
    
    // Song doesn't belong to the group
    return false
  }

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=track&limit=20`)
        const data = await response.json()
        if (data.tracks && data.tracks.items) {
          // Filter results to only show songs by the group
          const filteredResults = data.tracks.items.filter(song => isGroupSong(song))
          setResults(filteredResults)
          setShowDropdown(filteredResults.length > 0)
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, groupName, groupMembers])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSongClick(song) {
    setSelectedSong(song)
    setShowDropdown(false)
    setQuery('')
  }

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setShowDropdown(true)}
          placeholder={`Search ${groupName} songs...`}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent"
        />

        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent"></div>
          </div>
        )}

        {showDropdown && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            {results.map((song) => (
              <button
                key={song.id}
                onClick={() => handleSongClick(song)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 transition-colors"
              >
                <img
                  src={song.album?.images?.[2]?.url || '/placeholder.svg'}
                  alt={song.album?.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {song.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {song.artists?.map(artist => artist.name).join(', ')} • {song.album?.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSong && (
        <SongModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </>
  )
}