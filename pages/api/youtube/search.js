export default async function handler(req, res) {
  const { q } = req.query

  if (!q) {
    return res.status(400).json({ error: 'query q required' })
  }

  try {
    // Use YouTube's search API (requires API key)
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key not configured' })
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + ' official audio')}&type=video&maxResults=5&key=${apiKey}`
    const response = await fetch(searchUrl)

    if (!response.ok) {
      return res.status(response.status).json({ error: 'YouTube API error' })
    }

    const data = await response.json()
    const videos = data.items || []

    // Return the first video ID
    if (videos.length > 0) {
      return res.status(200).json({ videoId: videos[0].id.videoId })
    }

    return res.status(404).json({ error: 'No videos found' })
  } catch (error) {
    console.error('YouTube search error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}