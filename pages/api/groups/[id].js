import fs from 'fs'
import path from 'path'
export default function handler(req, res) {
  const { id } = req.query || {}
  const dataPath = path.resolve(process.cwd(), 'data', 'groups.json')
  try {
    const groups = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const group = groups.find(g => g.id === id) || null
    if (!group) return res.status(404).json({ error: 'group not found' })
    return res.status(200).json({ group })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}