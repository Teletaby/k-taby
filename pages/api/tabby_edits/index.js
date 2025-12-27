import fs from 'fs'
import path from 'path'

const DATA_PATH = path.resolve(process.cwd(), 'data', 'tiktok_tabby_edits.json')
const LIKES_PATH = path.resolve(process.cwd(), 'data', 'tiktok_likes.json')

export default function handler(req, res) {
  const { tag, liked } = req.query
  let items = []
  try {
    items = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  } catch (e) {
    return res.status(500).json({error: 'failed to read data'})
  }

  let likes = {}
  try { likes = JSON.parse(fs.readFileSync(LIKES_PATH, 'utf8')) } catch(e){ likes = {} }

  if (tag) {
    items = items.filter(i => i.hashtags && i.hashtags.includes(tag))
  }

  if (liked && liked === '1') {
    items = items.filter(i => !!likes[i.id])
  }

  // newest first
  items = items.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))

  res.json({items})
}