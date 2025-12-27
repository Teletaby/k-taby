import fs from 'fs'
import path from 'path'

const LIKES_PATH = path.resolve(process.cwd(), 'data', 'tiktok_likes.json')

function read() {
  try { return JSON.parse(fs.readFileSync(LIKES_PATH, 'utf8')) } catch(e){ return {} }
}
function write(obj) { fs.writeFileSync(LIKES_PATH, JSON.stringify(obj, null, 2)) }

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id, liked } = req.body
  if (!id) return res.status(400).json({error: 'missing id'})
  const likes = read()
  if (liked) likes[id] = true
  else delete likes[id]
  write(likes)
  res.json({ok:true, likes})
}