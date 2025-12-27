// Returns a random YouTube video id for a given channel or uses an explicit video id
// Query params:
// - channel: <channel_id> (makes request to https://www.youtube.com/feeds/videos.xml?channel_id=...)
// - feed: full feed url
// - video: explicit video id to return

export default async function handler(req, res) {
  const { channel, feed, video } = req.query

  if (video) {
    return res.status(200).json({ id: video })
  }

  let feedUrl = feed
  if (!feedUrl && channel) {
    feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`
  }

  if (!feedUrl) {
    return res.status(400).json({ error: 'Provide ?video=<id> or ?channel=<channel_id> or &feed=<feed_url>' })
  }

  try {
    const r = await fetch(feedUrl, { headers: { 'User-Agent': 'k-taby/1.0' } })
    if (!r.ok) return res.status(502).json({ error: 'Could not fetch feed' })
    const text = await r.text()

    // crude XML parsing to find all yt:videoId nodes
    const re = /<yt:videoId>([^<]+)<\/yt:videoId>/g
    const ids = []
    let m
    while ((m = re.exec(text)) !== null) {
      ids.push(m[1])
    }

    if (ids.length === 0) return res.status(404).json({ error: 'No videos found in feed' })

    const chosen = ids[Math.floor(Math.random() * ids.length)]
    return res.status(200).json({ id: chosen })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal error' })
  }
}
