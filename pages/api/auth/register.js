import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectToDatabase } from '../../../lib/mongodb'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' })
  }

  try {
    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    })

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = {
      username: username.toLowerCase(),
      displayName: username,
      email: email.toLowerCase(),
      password: hashedPassword,
      scores: [],
      createdAt: new Date(),
      lastLogin: new Date()
    }

    const result = await db.collection('users').insertOne(user)

    // Create JWT token
    const token = jwt.sign(
      { userId: result.insertedId, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    )

    // Set httpOnly cookie
    res.setHeader('Set-Cookie', `songgame_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`)

    res.status(201).json({
      success: true,
      user: {
        id: result.insertedId,
        username: user.displayName,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}