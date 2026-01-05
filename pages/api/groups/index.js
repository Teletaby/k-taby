import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'groups.json')
    const data = fs.readFileSync(filePath, 'utf8')
    const groups = JSON.parse(data)
    
    res.status(200).json({ groups })
  } catch (error) {
    console.error('Error reading groups:', error)
    res.status(500).json({ error: 'Failed to read groups' })
  }
}
