import { useState, useEffect } from 'react'

export default function Leaderboard({ mode, groupName, onClose, isAuthenticated = false, onSignIn, modal = true }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [mode, groupName])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (mode) params.append('mode', mode)
      if (groupName) params.append('groupName', groupName)
      params.append('limit', '20')

      console.log('Fetching leaderboard with params:', mode, groupName)

      const res = await fetch(`/api/auth/leaderboard?${params}`)
      const data = await res.json()

      console.log('Leaderboard response:', data)

      if (data.success) {
        setLeaderboard(data.leaderboard)
      } else {
        setError(data.error || 'Failed to load leaderboard')
      }
    } catch (err) {
      setError('Failed to load leaderboard')
      console.error('Leaderboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return modal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            🏆 Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Login to Join Leaderboard!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create an account to save your scores and compete with other players.
                </p>
                <button
                  onClick={onSignIn}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Login to Save Scores!
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Current Leaderboard:
                </p>
                {loading ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : error ? (
                  <p className="text-red-500 text-sm">{error}</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No scores yet!</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {leaderboard.slice(0, 5).map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold w-6 text-center">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {entry.username}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                          {formatTime(entry.bestScore)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No scores yet!</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Be the first to play and set a record!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700'
                      : index === 1
                      ? 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                      : index === 2
                      ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700'
                      : 'bg-gray-50 dark:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0
                        ? 'bg-yellow-400 text-yellow-900'
                        : index === 1
                        ? 'bg-gray-400 text-gray-900'
                        : index === 2
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {entry.username}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.totalGames} game{entry.totalGames !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                      {formatTime(entry.bestScore)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      avg time
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Lower average time = better score
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          🏆 Leaderboard
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {!isAuthenticated ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Login to Join Leaderboard!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create an account to save your scores and compete with other players.
              </p>
              <button
                onClick={onSignIn}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Login to Save Scores!
              </button>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Current Leaderboard:
              </p>
              {loading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <p className="text-red-500 text-sm">{error}</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No scores yet!</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold w-6 text-center">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {entry.username}
                        </span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        {formatTime(entry.bestScore)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No scores yet!</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Be the first to play and set a record!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700'
                    : index === 1
                    ? 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                    : index === 2
                    ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700'
                    : 'bg-gray-50 dark:bg-gray-700/30'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                    index === 0
                      ? 'bg-yellow-400 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-400 text-gray-900'
                      : index === 2
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {entry.username}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.totalGames} game{entry.totalGames !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                    {formatTime(entry.bestScore)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    avg time
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Lower average time = better score
        </p>
      </div>
    </div>
  )
}