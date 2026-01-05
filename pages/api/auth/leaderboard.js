import { connectToDatabase } from '../../../lib/mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { db } = await connectToDatabase()
    const { mode, groupName, limit = 10 } = req.query

    console.log('Leaderboard request:', { mode, groupName, limit })

    // Convert mode to number if it's provided
    const modeFilter = mode ? parseInt(mode) : null
    const groupNameFilter = groupName ? groupName.trim() : null

    // First, let's see what data we have
    const allUsers = await db.collection('users').find({}).toArray()
    console.log('All users in DB:', allUsers.map(u => ({
      username: u.username,
      displayName: u.displayName,
      scoresCount: u.scores?.length || 0,
      scores: u.scores?.slice(-2) // Show last 2 scores
    })))

    // Build aggregation pipeline
    const pipeline = [
      // Unwind scores array to get individual scores
      { $unwind: '$scores' },
      // Filter by mode and group if specified
      ...(modeFilter ? [{ $match: { 'scores.mode': modeFilter } }] : []),
      ...(groupNameFilter ? [{ $match: { 'scores.groupName': groupNameFilter } }] : []),
      // Group by user and calculate best score
      {
        $group: {
          _id: '$_id',
          username: { $first: '$displayName' },
          bestScore: { $min: '$scores.score' }, // Lower score is better
          totalGames: { $sum: 1 },
          lastPlayed: { $max: '$scores.date' }
        }
      },
      // Sort by best score (ascending - lower is better)
      { $sort: { bestScore: 1 } },
      // Limit results
      { $limit: parseInt(limit) },
      // Project final fields
      {
        $project: {
          _id: 0,
          username: 1,
          bestScore: 1,
          totalGames: 1,
          lastPlayed: 1
        }
      }
    ]

    const leaderboard = await db.collection('users').aggregate(pipeline).toArray()

    console.log('Leaderboard result:', leaderboard)

    res.status(200).json({
      success: true,
      leaderboard
    })

  } catch (error) {
    console.error('Leaderboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}