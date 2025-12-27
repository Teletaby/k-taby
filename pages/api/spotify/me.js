import { getTokensForUser } from '../../../lib/spotify_oauth'

export default function handler(req, res) {
  try {
    const cookies = req.headers.cookie || ''
    const m = cookies.match(/spotify_user=([^;]+)/)
    if (!m) return res.status(200).json({ connected: false })
    const userId = decodeURIComponent(m[1])
    const t = getTokensForUser(userId)
    if (!t) return res.status(200).json({ connected: false })
    return res.status(200).json({ connected: true, profile: t.profile })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}