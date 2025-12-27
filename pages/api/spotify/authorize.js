import { v4 as uuidv4 } from 'uuid'
import { saveState } from '../../../lib/spotify_oauth'

export default function handler(req, res) {
  const state = uuidv4()
  saveState(state, { ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress })

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const scopes = [
    'user-read-email',
    'user-read-private'
  ]
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    state
  })
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
}