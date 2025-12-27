import { popState, exchangeCodeForToken, getProfile, storeTokensForUser } from '../../../lib/spotify_oauth'

export default async function handler(req, res) {
  try {
    const { code, state } = req.query
    const saved = popState(state)
    if (!saved) return res.status(400).send('Invalid state')
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    const j = await exchangeCodeForToken(code, redirectUri)
    // j contains access_token, refresh_token, expires_in
    const profile = await getProfile(j.access_token)
    const userId = profile.id
    storeTokensForUser(userId, {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.now() + (j.expires_in || 3600) * 1000
    }, profile)

    // set cookie to remember current user (httpOnly)
    const cookieSecure = process.env.NODE_ENV === 'production'
    res.setHeader('Set-Cookie', `spotify_user=${encodeURIComponent(userId)}; HttpOnly; Path=/; ${cookieSecure ? 'Secure; ' : ''}SameSite=Lax`)

    // Redirect back to homepage or referrer
    res.redirect('/')
  } catch (e) {
    console.error('spotify callback error', e)
    res.status(500).send('auth failed')
  }
}
