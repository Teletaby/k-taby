import fs from 'fs'
import path from 'path'

const DATA_PATH = path.resolve(process.cwd(), 'data', 'site_social.json')

function isAdminFromReq(req) {
  const c = req.headers.cookie || ''
  const cookieOk = c.split(/;\s*/).some(x => x.trim() === 'ktaby_admin=1')
  const tokenHeader = (req.headers['x-admin-token'] || req.headers['authorization'] || '')
  const token = String(tokenHeader || '').replace(/^Bearer\s+/i, '')
  const secret = process.env.TABBY_ADMIN_TOKEN || ''
  const tokenOk = secret && token && token === secret
  return cookieOk || tokenOk
}

function read() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) } catch (e) { return {} }
}
function backup(file) {
  try { fs.copyFileSync(file, `${file}.bak.${Date.now()}`) } catch(e){}
}
function write(obj) {
  try { backup(DATA_PATH); fs.writeFileSync(DATA_PATH, JSON.stringify(obj, null, 2)) } catch(e) { throw e }
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({ social: read() })
  }
  if (req.method === 'POST') {
    if (!isAdminFromReq(req)) return res.status(403).json({ error: 'admin required' })
    const body = req.body || {}
    const cur = read()
    const updated = { ...cur, ...body }
    try { write(updated); return res.json({ ok: true, social: updated }) } catch (e) { return res.status(500).json({ error: 'failed to write' }) }
  }
  res.status(405).end()
}