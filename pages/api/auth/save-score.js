import jwt from 'jsonwebtoken'
import { connectToDatabase } from '../../../lib/mongodb'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.cookies.songgame_token

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')

    const { score, mode, groupName } = req.body

    console.log('Save score request:', { score, mode, groupName, userId: decoded.userId })

    if (typeof score !== 'number' || !mode || !groupName) {
      return res.status(400).json({ error: 'Score, mode, and groupName are required' })
    }

    const { db } = await connectToDatabase()

    // Add score to user's scores
    const gameScore = {
      score: Math.round(score * 100) / 100,
      mode: parseInt(mode), // Ensure mode is stored as number
      groupName: groupName.trim(), // Trim whitespace
      date: new Date()
    }

    console.log('Saving game score:', gameScore)

    await db.collection('users').updateOne(
      { _id: decoded.userId },
      { $push: { scores: gameScore } }
    )

    res.status(200).json({ success: true })

  } catch (error) {
    console.error('Save score error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}