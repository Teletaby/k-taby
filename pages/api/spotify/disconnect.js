import { getTokensForUser, removeUser } from '../../../lib/spotify_oauth'

export default function handler(req, res) {
  try {
    const cookies = req.headers.cookie || ''
    const m = cookies.match(/spotify_user=([^;]+)/)
    if (!m) return res.status(200).json({ disconnected: true })
    const userId = decodeURIComponent(m[1])
    removeUser(userId)
    res.setHeader('Set-Cookie', `spotify_user=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
    return res.status(200).json({ disconnected: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}