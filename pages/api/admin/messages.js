import { getDatabase } from '../../../lib/mongodb'

export default async function handler(req, res) {
  try {
    const db = await getDatabase()
    const collection = db.collection('messages')

    if (req.method === 'GET') {
      // Get all messages - allow if admin is logged in
      const cookies = req.headers.cookie || ''
      const isAdmin = cookies.includes('admin=true')

      // For now, allow all GET requests - messages are not sensitive
      // In production, you may want stricter auth
      const messages = await collection.find({}).sort({ timestamp: -1 }).toArray()
      return res.status(200).json({ messages })
    }

    if (req.method === 'POST') {
      const { message, name } = req.body || {}

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' })
      }

      try {
        const newMessage = {
          _id: Date.now().toString(),
          name: name || 'Anonymous',
          text: message.trim(),
          timestamp: new Date().toISOString(),
          read: false
        }

        await collection.insertOne(newMessage)
        console.log('Message saved:', newMessage)
        return res.status(200).json({ ok: true, message: newMessage })
      } catch (e) {
        console.error('Error saving message:', e)
        return res.status(500).json({ error: 'Failed to save message', details: e.message })
      }
    }

    if (req.method === 'PUT') {
      // Mark messages as read
      const { ids } = req.body || {}

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Message IDs are required' })
      }

      try {
        console.log('Updating messages with IDs:', ids)
        const result = await collection.updateMany(
          { _id: { $in: ids } },
          { $set: { read: true } }
        )
        console.log('Update result:', result)
        return res.status(200).json({ ok: true })
      } catch (e) {
        console.error('Error updating messages:', e)
        return res.status(500).json({ error: 'Failed to update messages' })
      }
    }

    if (req.method === 'DELETE') {
      // Delete messages
      const { ids } = req.body || {}

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Message IDs are required' })
      }

      try {
        console.log('Deleting messages with IDs:', ids)
        const result = await collection.deleteMany({
          _id: { $in: ids }
        })
        console.log('Delete result:', result)
        return res.status(200).json({ ok: true })
      } catch (e) {
        console.error('Error deleting messages:', e)
        return res.status(500).json({ error: 'Failed to delete messages' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Database error:', e)
    return res.status(500).json({ error: 'Database error' })
  }
}
