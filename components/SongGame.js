import { useState, useEffect, useRef } from 'react'

export default function SongGame({ albums = [], groupName = '', isAdmin = false }) {
  const [gameState, setGameState] = useState('mode-select') // mode-select, idle, loading, playing, result, leaderboard
  const [gameMode, setGameMode] = useState(null) // 5 or 10 songs
  const [currentRound, setCurrentRound] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [roundScores, setRoundScores] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [currentSong, setCurrentSong] = useState(null)
  const [options, setOptions] = useState([])
  const [timeLeft, setTimeLeft] = useState(5)
  const [startTime, setStartTime] = useState(null)
  const [currentGameScore, setCurrentGameScore] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [usedSongs, setUsedSongs] = useState(new Set())
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const youtubePlayerRef = useRef(null)

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
      
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready')
      }
    }
  }, [])

  // Prevent background scrolling when auth modal is open
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showAuthModal])

  // Load user data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('songGameUser')
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser))
      } catch (e) {
        console.error('Error loading user data:', e)
      }
    }
  }, [])

  // Authentication functions
  const handleLogin = () => {
    if (!authUsername.trim()) {
      alert('Please enter a username')
      return
    }

    // Simple local authentication - in a real app, this would be server-side
    const users = JSON.parse(localStorage.getItem('songGameUsers') || '[]')
    const user = users.find(u => u.username.toLowerCase() === authUsername.toLowerCase())

    if (!user) {
      alert('User not found. Please sign up first.')
      return
    }

    if (user.password !== authPassword) {
      alert('Incorrect password')
      return
    }

    setCurrentUser(user)
    localStorage.setItem('songGameUser', JSON.stringify(user))
    setShowAuthModal(false)
    setAuthUsername('')
    setAuthPassword('')
  }

  const handleSignup = () => {
    if (!authUsername.trim() || !authPassword.trim()) {
      alert('Please enter both username and password')
      return
    }

    if (authPassword.length < 4) {
      alert('Password must be at least 4 characters')
      return
    }

    const users = JSON.parse(localStorage.getItem('songGameUsers') || '[]')
    const existingUser = users.find(u => u.username.toLowerCase() === authUsername.toLowerCase())

    if (existingUser) {
      alert('Username already exists')
      return
    }

    const newUser = {
      id: Date.now().toString(),
      username: authUsername.trim(),
      password: authPassword,
      scores: [],
      createdAt: new Date().toISOString()
    }

    users.push(newUser)
    localStorage.setItem('songGameUsers', JSON.stringify(users))

    setCurrentUser(newUser)
    localStorage.setItem('songGameUser', JSON.stringify(newUser))
    setShowAuthModal(false)
    setAuthUsername('')
    setAuthPassword('')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('songGameUser')
  }

  const selectGameMode = (mode) => {
    setGameMode(mode)
    setCurrentRound(0)
    setTotalScore(0)
    setRoundScores([])
    setUsedSongs(new Set())
    setGameState('idle')
  }

  const startNewRound = async () => {
    setCurrentRound(prev => prev + 1)
    await startRound()
  }

  const finishGame = () => {
    // Calculate final score (lower time is better)
    const finalScore = roundScores.reduce((sum, score) => sum + score, 0)
    const avgTime = finalScore / roundScores.length

    setCurrentGameScore(avgTime)

    // Save to user's scores if logged in
    if (currentUser) {
      const users = JSON.parse(localStorage.getItem('songGameUsers') || '[]')
      const userIndex = users.findIndex(u => u.id === currentUser.id)
      if (userIndex !== -1) {
        const gameScore = {
          score: Math.round(avgTime * 100) / 100,
          mode: gameMode,
          date: new Date().toISOString(),
          groupName: groupName
        }
        users[userIndex].scores = users[userIndex].scores || []
        users[userIndex].scores.push(gameScore)
        localStorage.setItem('songGameUsers', JSON.stringify(users))
        setCurrentUser(users[userIndex])
      }
    }

    // Add to leaderboard only if user is logged in
    if (currentUser) {
      // Personal bests are now shown instead of global leaderboard
      // No global leaderboard update needed
    }
    setGameState('leaderboard')
  }

  // Collect all tracks with their album info
  const allTracks = albums.flatMap(album =>
    (album.tracks || []).filter(track => track && track.name).map(track => ({
      ...track,
      albumId: album.id,
      albumName: album.name
    }))
  )

  const findPreview = async (track) => {
    try {
      console.log('Searching for preview of:', track.name)
      
      // First, check if we already have a cached preview
      if (track.preview_url) {
        console.log('Using cached preview:', track.preview_url)
        return { type: 'spotify', url: track.preview_url }
      }
      
      // Try searching Spotify directly for this track
      const q = encodeURIComponent(`${track.name} ${track.albumName || ''}`)
      const res = await fetch(`/api/spotify/search?q=${q}&type=track&limit=20`)
      
      if (res.ok) {
        const j = await res.json()
        console.log('Search results count:', j.tracks?.items?.length || 0)
        
        if (j.tracks && j.tracks.items && j.tracks.items.length) {
          // Look for tracks with previews
          for (const item of j.tracks.items) {
            console.log(`Track: ${item.name}, Preview: ${item.preview_url ? 'YES' : 'NO'}`)
            if (item.preview_url) {
              console.log('Found preview URL:', item.preview_url)
              return { type: 'spotify', url: item.preview_url }
            }
          }
          console.log('No previews found in search results')
        }
      } else {
        console.log('Search failed with status:', res.status)
      }
      
      // Try fetching the specific album to get fresh track data
      if (track.albumId) {
        console.log('Trying to fetch fresh album data for:', track.albumId)
        const albumRes = await fetch(`/api/spotify/album/${encodeURIComponent(track.albumId)}`)
        if (albumRes.ok) {
          const albumData = await albumRes.json()
          console.log('Album tracks count:', albumData.tracks?.items?.length || 0)
          if (albumData.tracks && albumData.tracks.items) {
            const freshTrack = albumData.tracks.items.find(t => 
              t.name.toLowerCase().includes(track.name.toLowerCase()) || 
              track.name.toLowerCase().includes(t.name.toLowerCase())
            )
            console.log('Fresh track found:', freshTrack?.name, 'Preview:', freshTrack?.preview_url)
            if (freshTrack && freshTrack.preview_url) {
              console.log('Found fresh preview URL:', freshTrack.preview_url)
              return { type: 'spotify', url: freshTrack.preview_url }
            }
          }
        } else {
          console.log('Album fetch failed with status:', albumRes.status)
        }
      }
      
      // Fallback to YouTube
      console.log('No Spotify preview, trying YouTube for:', track.name)
      const ytQuery = `${track.name} ${track.albumName || ''} official music video`
      const ytRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(ytQuery)}`)
      
      if (ytRes.ok) {
        const ytData = await ytRes.json()
        if (ytData.videoId) {
          console.log('Found YouTube video for:', track.name, 'ID:', ytData.videoId)
          return { type: 'youtube', videoId: ytData.videoId }
        }
      }
      
      console.log('No preview available for this track')
      return null
    } catch (e) {
      console.error('Error finding preview:', e)
      return null
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRound = async () => {
    if (allTracks.length < 3) {
      alert('Not enough songs to play the game!')
      return
    }

    setGameState('loading')

    // Filter out used songs
    const availableTracks = allTracks.filter(track => !usedSongs.has(track.id))
    
    if (availableTracks.length < 3) {
      alert('Not enough unused songs remaining! Starting fresh.')
      setUsedSongs(new Set())
      return
    }

    let attempts = 0
    let correctSong = null
    let previewData = null

    // Try up to 5 songs to find one with a preview using the user's Spotify API or YouTube
    while (attempts < 5 && !previewData) {
      attempts++
      correctSong = availableTracks[Math.floor(Math.random() * availableTracks.length)]

      console.log(`Attempting to find preview for: ${correctSong.name}`)
      previewData = await findPreview(correctSong)
      console.log(`Found preview: ${previewData ? previewData.type : 'no'}`)
    }

    if (!previewData) {
      // Fall back to text-based game if no previews available
      console.log('No previews available, falling back to text-based game')
      setCurrentSong(correctSong)
      setOptions([correctSong, ...allTracks.filter(t => t.id !== correctSong.id).slice(0, 2)].sort(() => 0.5 - Math.random()))
      setGameState('playing')
      setTimeLeft(5)
      setStartTime(Date.now())
      setSelectedOption(null)
      setIsCorrect(null)

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            endRound()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return
    }

    // Found a preview! Play the audio game
    const wrongTracks = allTracks.filter(t => t.id !== correctSong.id)
    const shuffledWrong = wrongTracks.sort(() => 0.5 - Math.random()).slice(0, 2)

    const gameOptions = [correctSong, ...shuffledWrong].sort(() => 0.5 - Math.random())

    setCurrentSong({ ...correctSong, previewData })
    setOptions(gameOptions)
    setGameState('playing')
    setAudioBlocked(false)
    setTimeLeft(5)
    setSelectedOption(null)
    setIsCorrect(null)

    // Add to used songs
    setUsedSongs(prev => new Set([...prev, correctSong.id]))

    // Start audio based on type
    if (previewData.type === 'spotify') {
      // Handle Spotify audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      
      console.log('Creating Spotify audio with preview URL:', previewData.url)
      audioRef.current = new Audio(previewData.url)
      audioRef.current.volume = 0.3
      
      // Add event listeners for debugging
      audioRef.current.addEventListener('loadstart', () => console.log('Spotify audio load started'))
      audioRef.current.addEventListener('canplay', () => console.log('Spotify audio can play'))
      audioRef.current.addEventListener('error', (e) => {
        console.error('Spotify audio error:', e)
        // If audio fails to load, fall back to text game
        console.log('Spotify audio failed, falling back to text game')
        setGameState('playing')
        setTimeLeft(5)
        setStartTime(Date.now())
        setSelectedOption(null)
        setIsCorrect(null)
        // Clear any existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 0) {
              endRound()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      })
      audioRef.current.addEventListener('abort', () => console.log('Spotify audio aborted'))
      
      // Stop audio after 5 seconds
      setTimeout(() => {
        if (audioRef.current) {
          console.log('Stopping Spotify audio after 5 seconds')
          audioRef.current.pause()
        }
      }, 5000)
      
      console.log('Attempting to play Spotify audio...')
      const playPromise = audioRef.current.play()
      if (playPromise) {
        playPromise.then(() => {
          console.log('Spotify audio started playing successfully')
          // Clear any existing timer and start timer only after audio has started
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          setTimeLeft(5)
          setStartTime(Date.now())
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 0) {
                endRound()
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }).catch(e => {
          console.error('Spotify audio play failed:', e)
          if (e.name === 'NotAllowedError') {
            console.log('Spotify autoplay blocked - showing manual play button')
            setAudioBlocked(true)
            setGameState('playing')
            setTimeLeft(5)
            setStartTime(Date.now())
            setSelectedOption(null)
            setIsCorrect(null)
            timerRef.current = setInterval(() => {
              setTimeLeft(prev => {
                if (prev <= 0) {
                  endRound()
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          }
        })
      }
    } else if (previewData.type === 'youtube') {
      // Handle YouTube video
      console.log('Creating YouTube player for video ID:', previewData.videoId)
      
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy()
      }
      
      if (window.YT && window.YT.Player) {
        try {
          youtubePlayerRef.current = new window.YT.Player('youtube-player', {
            height: '0',
            width: '0',
            videoId: previewData.videoId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              showinfo: 0
            },
            events: {
              onReady: (event) => {
                console.log('YouTube player ready')
                try {
                  event.target.setVolume(30)
                  event.target.seekTo(30) // Start 30 seconds in to avoid intros
                  event.target.playVideo()
                  
                  // Clear any existing timer and start timer only after video has started
                  if (timerRef.current) {
                    clearInterval(timerRef.current)
                  }
                  setTimeLeft(5)
                  setStartTime(Date.now())
                  timerRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                      if (prev <= 0) {
                        endRound()
                        return 0
                      }
                      return prev - 1
                    })
                  }, 1000)
                  
                  // Stop after 5 seconds
                  setTimeout(() => {
                    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.pauseVideo === 'function') {
                      console.log('Stopping YouTube video after 5 seconds')
                      youtubePlayerRef.current.pauseVideo()
                    } else {
                      console.log('YouTube player not ready to pause')
                    }
                  }, 5000)
                } catch (e) {
                  console.error('Error in YouTube player onReady:', e)
                  // Fall back to text game
                  setGameState('playing')
                  setTimeLeft(5)
                  setStartTime(Date.now())
                  setSelectedOption(null)
                  setIsCorrect(null)
                  // Clear any existing timer
                  if (timerRef.current) {
                    clearInterval(timerRef.current)
                  }
                  timerRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                      if (prev <= 0) {
                        endRound()
                        return 0
                      }
                      return prev - 1
                    })
                  }, 1000)
                }
              },
              onError: (error) => {
                console.error('YouTube player error:', error)
                // Fall back to text game
                setGameState('playing')
                setTimeLeft(5)
                setStartTime(Date.now())
                setSelectedOption(null)
                setIsCorrect(null)
                
                // Clear any existing timer
                if (timerRef.current) {
                  clearInterval(timerRef.current)
                }
                
                timerRef.current = setInterval(() => {
                  setTimeLeft(prev => {
                    if (prev <= 0) {
                      endRound()
                      return 0
                    }
                    return prev - 1
                  })
                }, 1000)
              }
            }
          })
        } catch (e) {
          console.error('Error creating YouTube player:', e)
          // Fall back to text game
          setGameState('playing')
          setTimeLeft(5)
          setStartTime(Date.now())
          setSelectedOption(null)
          setIsCorrect(null)
          
          // Clear any existing timer
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 0) {
                endRound()
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
      } else {
        console.log('YouTube API not ready, falling back to text game')
        setGameState('playing')
        setTimeLeft(5)
        setStartTime(Date.now())
        setSelectedOption(null)
        setIsCorrect(null)
        // Clear any existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 0) {
              endRound()
              return 0
            }
            return prev - 1
          })
        }, 1000)
        return
      }
    }

    // Timer will be started when audio begins playing
  }

  const endRound = (selectedOptionParam, isCorrectParam) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.pauseVideo === 'function') {
      youtubePlayerRef.current.pauseVideo()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Use the passed parameters or the state
    const option = selectedOptionParam !== undefined ? selectedOptionParam : selectedOption
    const correct = isCorrectParam !== undefined ? isCorrectParam : (option ? (option.id === currentSong.id) : false)

    // Calculate score for this round (time taken to answer)
    const timeTaken = option 
      ? Math.min(5, (Date.now() - startTime) / 1000) // Cap at 5 seconds
      : 5 // Timeout = 5 seconds
    const roundScore = correct ? timeTaken : 10 // Wrong answers get max time penalty

    setRoundScores(prev => [...prev, roundScore])
    setTotalScore(prev => prev + roundScore)

    setGameState('result')
  }

  const selectOption = (option) => {
    if (gameState !== 'playing') return
    
    // Stop the timer immediately when an option is selected
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    const isCorrectAnswer = option.id === currentSong.id
    setSelectedOption(option)
    setIsCorrect(isCorrectAnswer)
    endRound(option, isCorrectAnswer)
  }

  const nextRound = () => {
    if (currentRound >= gameMode) {
      finishGame()
    } else {
      startNewRound()
    }
  }

  const resetGame = () => {
    setGameState('mode-select')
    setGameMode(null)
    setCurrentRound(0)
    setTotalScore(0)
    setRoundScores([])
    setUsedSongs(new Set())
    setCurrentSong(null)
    setOptions([])
    setAudioBlocked(false)
    setTimeLeft(5)
    setStartTime(null)
    setCurrentGameScore(null)
    setSelectedOption(null)
    setIsCorrect(null)
  }

  if (allTracks.length < 3) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Not enough songs available for this group.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {gameState === 'mode-select' && (
          <div className="text-center py-1 md:py-2 px-4 flex-1 flex flex-col justify-center">
            {/* Gameshow Title */}
            <div className="mb-2">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">
                {groupName ? `${groupName} - ` : ''}SONG GUESSING
              </h1>
              <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Test your {groupName || 'music'} knowledge! Guess songs from 5-second audio previews.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 max-w-2xl mx-auto mt-1">
                * Some songs may not be correct and we are aware of it.
              </p>
            </div>

            {/* User Authentication Section */}
            <div className="mb-2 max-w-md mx-auto">
              {currentUser ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center mb-1">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-semibold text-green-700 dark:text-green-300 text-sm">
                      Welcome, {currentUser.username}!
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Games: {currentUser.scores?.length || 0}
                    </p>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg border-2 border-gray-200 dark:border-gray-700">
                  <p className="text-center text-gray-700 dark:text-gray-300 mb-2 text-sm">
                    Login to save scores!
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                             text-white font-semibold py-2 px-4 rounded-lg shadow-lg 
                             transform hover:scale-105 transition-all duration-200 text-sm"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login / Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Game Mode Selection */}
            <div className="mb-2 flex-1 flex flex-col justify-center">
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                Choose Your Challenge:
              </h3>
              <div className="space-y-2 md:space-y-3 max-w-lg mx-auto">
                <button
                  onClick={() => selectGameMode(5)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                           text-white font-black py-2 md:py-3 px-4 rounded-xl shadow-xl 
                           transform hover:scale-105 transition-all duration-300 
                           border-2 md:border-4 border-green-400 hover:border-green-300
                           text-base md:text-lg"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 md:w-8 md:h-8 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-black">QUICK GAME</div>
                      <div className="text-sm md:text-base font-semibold opacity-90">5 Songs</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => selectGameMode(10)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                           text-white font-black py-2 md:py-3 px-4 rounded-xl shadow-xl 
                           transform hover:scale-105 transition-all duration-300 
                           border-2 md:border-4 border-red-400 hover:border-red-300
                           text-base md:text-lg"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 md:w-8 md:h-8 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-black">CHALLENGE MODE</div>
                      <div className="text-sm md:text-base font-semibold opacity-90">10 Songs</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Leaderboard Button */}
            <div className="mb-4">
              <button
                onClick={() => setGameState('leaderboard')}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 
                         text-white font-bold py-3 px-6 rounded-full shadow-lg 
                         transform hover:scale-105 transition-all duration-200"
              >
                � View Your Bests
              </button>
            </div>
          </div>
        )}

        {gameState === 'idle' && (
          <div className="text-center py-2 md:py-4 px-4">
            {/* Round Header */}
            <div className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 
                          rounded-lg p-4 shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                <svg className="w-8 h-8 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Round {currentRound + 1}
              </h2>
              <p className="text-lg text-blue-100">
                {gameMode === 5 ? 'Quick Game' : 'Challenge Mode'} • {gameMode} Songs Total
              </p>
            </div>

            {/* Instructions */}
            <div className="mb-4 max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border-2 border-gray-200 dark:border-gray-700">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  How to Play
                </h3>
                <div className="text-left space-y-3 text-gray-700 dark:text-gray-300">
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                    <p>Listen to the 5-second audio preview</p>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                    <p>Choose the correct song from 3 options</p>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                    <p>Faster answers = better scores!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="mb-6">
              <button
                onClick={startNewRound}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                         text-white font-black py-5 px-10 rounded-full shadow-xl 
                         transform hover:scale-110 transition-all duration-300 
                         text-xl md:text-2xl border-4 border-green-400 hover:border-green-300"
              >
                <svg className="w-6 h-6 mr-2 inline" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                START ROUND {currentRound + 1}
              </button>
            </div>

            {/* Test Button */}
            {isAdmin && (
              <div className="mb-4">
                <button
                  onClick={async () => {
                    console.log('Testing preview availability...')
                    const testTrack = allTracks[Math.floor(Math.random() * allTracks.length)]
                    console.log('Testing with track:', testTrack.name)
                    const preview = await findPreview(testTrack)
                    if (preview) {
                      console.log('✅ Preview found:', preview)
                      alert(`✅ Preview found for "${testTrack.name}": ${preview.type === 'spotify' ? 'Spotify' : 'YouTube'}`)
                    } else {
                      console.log('❌ No preview found')
                      alert(`❌ No preview available for "${testTrack.name}"`)
                    }
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-full 
                           text-sm transition-colors"
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Test Audio
                </button>
              </div>
            )}
          </div>
        )}

      {gameState === 'loading' && (
        <div className="text-center py-4 px-4">
          <div className="mb-4">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-16 w-16 md:h-20 md:w-20 
                            border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              <svg className="w-8 h-8 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Loading Challenge...
            </h2>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 
                          rounded-lg p-6 max-w-md mx-auto">
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                Finding the perfect song
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Searching for audio previews...
              </p>
            </div>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="text-center py-2 md:py-4 px-4">
          {/* Gameshow Header */}
          <div className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-800 dark:to-pink-800 rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <h2 className="text-xl md:text-2xl font-bold text-white">Song Challenge</h2>
            </div>
            <p className="text-sm md:text-base text-purple-100">
              Round {currentRound} of {gameMode}
            </p>
          </div>

          {/* Timer Display - Gameshow Style */}
          <div className="mb-6">
            <div className="relative">
              <div className="bg-black rounded-full w-24 h-24 md:w-32 md:h-32 mx-auto flex items-center justify-center shadow-2xl border-4 border-yellow-400">
                <div className="text-center">
                  <div className={`text-3xl md:text-4xl font-bold mb-1 transition-colors duration-300 ${
                    timeLeft <= 2 ? 'text-red-500 animate-pulse' : 
                    timeLeft <= 3 ? 'text-yellow-500' : 
                    'text-white'
                  }`}>
                    {timeLeft}
                  </div>
                  <div className="text-xs md:text-sm text-gray-300 font-semibold">
                    SECONDS
                  </div>
                </div>
              </div>
              {/* Timer ring animation */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin" 
                   style={{animationDuration: '1s'}}></div>
            </div>
          </div>

          {/* Audio Blocked Message */}
          {audioBlocked && (
            <div className="mb-6 bg-red-600 text-white p-4 rounded-lg shadow-lg">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-8 h-8 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
                <span className="font-bold">Audio Blocked!</span>
              </div>
              <p className="text-sm mb-3">Click to enable audio preview</p>
              <button
                onClick={() => {
                  if (currentSong?.previewData?.type === 'spotify' && audioRef.current) {
                    console.log('Manually playing Spotify audio...')
                    audioRef.current.play().then(() => {
                      console.log('Manual Spotify audio play successful')
                      setAudioBlocked(false)
                    }).catch(e => console.error('Manual Spotify audio play failed:', e))
                  } else if (currentSong?.previewData?.type === 'youtube' && youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
                    console.log('Manually playing YouTube video...')
                    youtubePlayerRef.current.playVideo()
                    setAudioBlocked(false)
                  }
                }}
                className="bg-white text-red-600 px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                PLAY AUDIO
              </button>
            </div>
          )}

          {/* Answer Options - Gameshow Style */}
          <div className="space-y-3 md:space-y-4 max-w-lg mx-auto">
            {options.map((option, index) => (
              <button
                key={option.id || index}
                onClick={() => selectOption(option)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                         text-white font-bold py-3 md:py-4 px-4 rounded-xl shadow-lg 
                         transform hover:scale-105 transition-all duration-200 
                         border-2 border-blue-400 hover:border-blue-300
                         text-left text-base md:text-lg"
              >
                <div className="flex items-center">
                  <span className="bg-blue-800 text-white rounded-full w-8 h-8 md:w-10 md:h-10 
                                 flex items-center justify-center font-bold mr-3 md:mr-4 text-sm md:text-base">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Listen carefully and choose the correct song!
            </p>
          </div>
        </div>
      )}

      {gameState === 'result' && (
        <div className="text-center py-2 md:py-4 px-4">
          {/* Result Header */}
          <div className={`mb-4 p-4 rounded-lg shadow-lg ${
            isCorrect 
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}>
            <div className="flex items-center justify-center mb-2">
              {isCorrect ? (
                <svg className="w-10 h-10 md:w-12 md:h-12 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 md:w-12 md:h-12 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.966-5.5-2.5" />
                </svg>
              )}
              <h2 className="text-2xl md:text-3xl font-bold">
                {isCorrect ? 'Correct!' : 'Wrong Answer!'}
              </h2>
            </div>
            <p className="text-sm md:text-base opacity-90">
              Round {currentRound} of {gameMode}
            </p>
          </div>

          {/* Song Reveal */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                {currentSong.name}
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                from <span className="font-semibold">{currentSong.albumName || 'Unknown Album'}</span>
              </p>
            </div>

            {selectedOption && !isCorrect && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  You selected: <span className="font-semibold">{selectedOption.name}</span>
                </p>
              </div>
            )}
          </div>

          {/* Score Display */}
          <div className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-yellow-900 font-semibold mb-1">ROUND SCORE</p>
              <p className="text-3xl md:text-4xl font-bold text-yellow-900">
                {roundScores[roundScores.length - 1]?.toFixed(1)}s
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Total: {totalScore.toFixed(1)}s average
              </p>
            </div>
          </div>

          {/* Next Round Button */}
          <div className="space-y-2">
            <button
              onClick={nextRound}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 
                       text-white font-bold py-4 px-8 rounded-full shadow-lg 
                       transform hover:scale-105 transition-all duration-200 
                       text-lg md:text-xl"
            >
              {currentRound >= gameMode ? (
                <>
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Finish Game
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Next Round
                </>
              )}
            </button>
            <div>
              <button
                onClick={resetGame}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         font-semibold text-sm underline"
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && (
        <div className="text-center py-2 md:py-4 px-4">
          {/* Personal Bests Header */}
          <div className="mb-4">
            <div className="inline-block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 
                          bg-clip-text text-transparent mb-4">
              <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-gray-100 mb-2">
              YOUR BEST SCORES
            </h1>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
              {currentUser ? `Keep beating your records, ${currentUser.username}!` : 'Sign in to track your progress!'}
            </p>
            {currentUser && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                💡 Since there's no database, you can only compete against your own previous best scores!
              </p>
            )}
          </div>

          {/* Personal Bests Display */}
          <div className="max-w-2xl mx-auto mb-8">
            {currentUser && currentUser.scores && currentUser.scores.length > 0 ? (
              <div className="space-y-4">
                {/* Best 5-song score */}
                {(() => {
                  const fiveSongScores = currentUser.scores.filter(s => s.mode === 5)
                  const bestFiveSong = fiveSongScores.length > 0 ? 
                    fiveSongScores.reduce((best, current) => current.score < best.score ? current : best) : null
                  
                  return bestFiveSong ? (
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 md:p-6 rounded-xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-3xl md:text-4xl mr-4">
                            <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-black text-lg md:text-xl">
                              QUICK GAME BEST
                            </p>
                            <p className="text-sm opacity-90">
                              5 songs • {new Date(bestFiveSong.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl md:text-4xl font-black">
                            {bestFiveSong.score}s
                          </p>
                          <p className="text-xs md:text-sm opacity-90">avg time</p>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Best 10-song score */}
                {(() => {
                  const tenSongScores = currentUser.scores.filter(s => s.mode === 10)
                  const bestTenSong = tenSongScores.length > 0 ? 
                    tenSongScores.reduce((best, current) => current.score < best.score ? current : best) : null
                    
                  return bestTenSong ? (
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 md:p-6 rounded-xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-3xl md:text-4xl mr-4">
                            <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-black text-lg md:text-xl">
                              CHALLENGE BEST
                            </p>
                            <p className="text-sm opacity-90">
                              10 songs • {new Date(bestTenSong.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl md:text-4xl font-black">
                            {bestTenSong.score}s
                          </p>
                          <p className="text-xs md:text-sm opacity-90">avg time</p>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Stats Summary */}
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 
                              rounded-lg p-4 md:p-6 shadow-lg">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Your Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100">
                        {currentUser.scores.length}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Games</p>
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100">
                        {currentUser.scores.length > 0 ? 
                          (currentUser.scores.reduce((sum, s) => sum + s.score, 0) / currentUser.scores.length).toFixed(2) : '0.00'}s
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentGameScore !== null ? (
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 
                            rounded-lg p-8 shadow-lg">
                <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Game Complete!
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your average time: <span className="font-bold text-blue-600 dark:text-blue-400">{currentGameScore.toFixed(2)}s</span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Sign in to save and track your progress.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 
                            rounded-lg p-8 shadow-lg">
                <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Sign in to track your progress!
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Create an account to save and track your progress.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setGameState('mode-select')}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 
                       text-white font-bold py-4 px-8 rounded-full shadow-lg 
                       transform hover:scale-105 transition-all duration-200 
                       text-lg md:text-xl"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Start New Game
            </button>
            <div>
              <button
                onClick={resetGame}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         font-semibold text-sm underline"
              >
                Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Message */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          If there is a bug or feedback you would like to report, please message me on TikTok @tabby_edits
        </p>
      </div>
    </div>

    {/* Authentication Modal */}
    {showAuthModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLogin ? 'Login' : 'Sign Up'}
            </h2>
            <button
              onClick={() => setShowAuthModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>

            <button
              onClick={isLogin ? handleLogin : handleSignup}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 
                       text-white font-bold py-3 px-6 rounded-lg shadow-lg 
                       transform hover:scale-105 transition-all duration-200"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>

            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
              >
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Hidden YouTube player */}
    <div id="youtube-player" style={{ display: 'none' }}></div>
    </>
  )
}