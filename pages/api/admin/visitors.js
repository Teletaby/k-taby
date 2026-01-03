import fs from 'fs'
import path from 'path'
import { getDatabase } from '../../../lib/mongodb'

const VISITOR_LOG_FILE = path.resolve(process.cwd(), 'data', 'visitor_log.json')

// Helper function to check if user is admin
function isAdmin(req) {
  const c = req.headers.cookie || ''
  return c.split(/;\s*/).some(x => x.trim() === 'ktaby_admin=1')
}

// Get client IP address
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for']
  const realIP = req.headers['x-real-ip']
  const clientIP = req.headers['x-client-ip']

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (clientIP) {
    return clientIP
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
}

// Detect if user agent is mobile
function isMobile(userAgent) {
  if (!userAgent) return false
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(userAgent)
}

// Extract browser info from user agent
function getBrowserInfo(userAgent) {
  if (!userAgent) return 'Unknown'

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome'
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox'
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari'
  }
  if (userAgent.includes('Edg')) {
    return 'Edge'
  }
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'Opera'
  }

  return 'Other'
}

// Load visitor log from MongoDB
async function loadVisitorLog() {
  try {
    const db = await getDatabase()
    const visitorsCollection = db.collection('visitors')
    const logs = await visitorsCollection.find({}).sort({ timestamp: -1 }).limit(1000).toArray()
    // Remove MongoDB _id field
    return logs.map(log => {
      const { _id, ...rest } = log
      return rest
    })
  } catch (e) {
    console.error('Error loading visitor log from MongoDB:', e)
    // Fallback to file
    try {
      if (fs.existsSync(VISITOR_LOG_FILE)) {
        const data = fs.readFileSync(VISITOR_LOG_FILE, 'utf8')
        return JSON.parse(data)
      }
    } catch (fileError) {
      console.error('Error loading visitor log from file:', fileError)
    }
  }
  return []
}

// Save visitor log to MongoDB
async function saveVisitorLog(log) {
  try {
    const db = await getDatabase()
    const visitorsCollection = db.collection('visitors')
    
    // Clear old collection first
    await visitorsCollection.deleteMany({})
    
    // Insert new logs without _id to avoid duplicates
    if (log.length > 0) {
      const logsToInsert = log.map(entry => {
        const { _id, ...rest } = entry
        return rest
      })
      await visitorsCollection.insertMany(logsToInsert)
    }
    
    console.log('✅ Visitor log saved to MongoDB')
  } catch (e) {
    console.error('Error saving visitor log to MongoDB:', e)
    // Fallback to file
    try {
      const dataDir = path.dirname(VISITOR_LOG_FILE)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(VISITOR_LOG_FILE, JSON.stringify(log, null, 2))
    } catch (fileError) {
      console.error('Error saving visitor log to file:', fileError)
    }
  }
}

// Middleware function to log visitors (call this from _app.js or middleware)
export async function logVisitor(req, page = '/') {
  try {
    const ip = getClientIP(req)
    const userAgent = req.headers['user-agent'] || ''
    const isMobileDevice = isMobile(userAgent)
    const browser = getBrowserInfo(userAgent)

    const visitorEntry = {
      timestamp: new Date().toISOString(),
      ip: ip,
      browser: browser,
      isMobile: isMobileDevice,
      page: page,
      userAgent: userAgent.substring(0, 200) // Truncate for storage
    }

    const log = await loadVisitorLog()
    log.unshift(visitorEntry) // Add to beginning

    // Keep only last 1000 entries to prevent storage from growing too large
    if (log.length > 1000) {
      log.splice(1000)
    }

    await saveVisitorLog(log)
  } catch (e) {
    // Don't throw errors in logging middleware
    console.error('Error logging visitor:', e)
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const visitors = await loadVisitorLog()
    return res.status(200).json({ visitors })
  }

  if (req.method === 'POST') {
    // Log a visitor (no admin check needed for logging)
    const { page = '/' } = req.body || {}
    await logVisitor(req, page)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      // Clear the visitor log by saving an empty array
      await saveVisitorLog([])
      return res.status(200).json({ message: 'Visitor logs cleared successfully' })
    } catch (e) {
      console.error('Error clearing visitor logs:', e)
      return res.status(500).json({ error: 'Failed to clear visitor logs' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}