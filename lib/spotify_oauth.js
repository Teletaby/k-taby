const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

const TOKENS_FILE = path.resolve(process.cwd(), 'data', 'spotify_user_tokens.json')
const STATE_FILE = path.resolve(process.cwd(), 'data', 'spotify_state.json')

function readJson(p) {
  try { if (!fs.existsSync(p)) return {} ; return JSON.parse(fs.readFileSync(p, 'utf8')||'{}')} catch (e) { return {} }
}
function writeJson(p, obj) { try { fs.writeFileSync(p, JSON.stringify(obj||{}, null, 2), 'utf8') } catch (e) {} }

function saveState(state, value) {
  const s = readJson(STATE_FILE)
  s[state] = { value, createdAt: Date.now() }
  writeJson(STATE_FILE, s)
}
function popState(state) {
  const s = readJson(STATE_FILE)
  const v = s[state]
  delete s[state]
  writeJson(STATE_FILE, s)
  return v && v.value
}

function storeTokensForUser(userId, tokens, profile) {
  const t = readJson(TOKENS_FILE)
  t[userId] = { tokens, profile, updatedAt: Date.now() }
  writeJson(TOKENS_FILE, t)
}
function getTokensForUser(userId) {
  const t = readJson(TOKENS_FILE)
  return t[userId] || null
}
function removeUser(userId) {
  const t = readJson(TOKENS_FILE)
  delete t[userId]
  writeJson(TOKENS_FILE, t)
}

async function exchangeCodeForToken(code, redirectUri) {
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', redirectUri)

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })
  if (!res.ok) throw new Error('token exchange failed: ' + res.status)
  return res.json()
}

async function refreshToken(refreshToken) {
  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', refreshToken)

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })
  if (!res.ok) throw new Error('refresh failed: ' + res.status)
  return res.json()
}

async function getProfile(accessToken) {
  const r = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!r.ok) throw new Error('profile fetch failed')
  return r.json()
}

module.exports = { saveState, popState, storeTokensForUser, getTokensForUser, removeUser, exchangeCodeForToken, refreshToken, getProfile }
