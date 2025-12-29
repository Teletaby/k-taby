export default async function handler(req, res) {
  const { url } = req.query
  
  if (!url) {
    return res.status(400).json({ error: 'url parameter required' })
  }

  try {
    // Validate URL is from Spotify
    if (!url.startsWith('https://p.scdn.co/mp3-preview/')) {
      return res.status(400).json({ error: 'invalid preview URL' })
    }

    const response = await fetch(url)
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'failed to fetch preview' })
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')

    // Stream the audio data
    response.body.pipe(res)
  } catch (error) {
    console.error('Preview proxy error:', error)
    res.status(500).json({ error: 'internal server error' })
  }
}