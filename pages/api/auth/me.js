import jwt from 'jsonwebtoken'
import { connectToDatabase } from '../../../lib/mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.cookies.songgame_token

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')

    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne(
      { _id: decoded.userId },
      { projection: { password: 0 } } // Exclude password from response
    )

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.displayName,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Auth check error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
}