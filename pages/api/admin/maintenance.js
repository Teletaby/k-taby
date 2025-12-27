import { readState, writeState } from '../../../lib/siteState'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminmoako'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const s = readState()
    return res.status(200).json(s)
  }

  if (req.method === 'POST') {
    const { password, enabled, message } = req.body || {}
    if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' })

    const state = readState()
    state.maintenance = { enabled: !!enabled, message: message || '' }
    const ok = writeState(state)
    if (!ok) return res.status(500).json({ error: 'failed to write state' })
    return res.status(200).json({ ok: true, state })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
