import fs from 'fs'
import path from 'path'

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

// Load visitor log
function loadVisitorLog() {
  try {
    if (fs.existsSync(VISITOR_LOG_FILE)) {
      const data = fs.readFileSync(VISITOR_LOG_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Error loading visitor log:', e)
  }
  return []
}

// Save visitor log
function saveVisitorLog(log) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(VISITOR_LOG_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    fs.writeFileSync(VISITOR_LOG_FILE, JSON.stringify(log, null, 2))
  } catch (e) {
    console.error('Error saving visitor log:', e)
  }
}

// Middleware function to log visitors (call this from _app.js or middleware)
export function logVisitor(req, page = '/') {
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

    const log = loadVisitorLog()
    log.unshift(visitorEntry) // Add to beginning

    // Keep only last 1000 entries to prevent file from growing too large
    if (log.length > 1000) {
      log.splice(1000)
    }

    saveVisitorLog(log)
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

    const visitors = loadVisitorLog()
    return res.status(200).json({ visitors })
  }

  if (req.method === 'POST') {
    // Log a visitor (no admin check needed for logging)
    const { page = '/' } = req.body || {}
    logVisitor(req, page)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      // Clear the visitor log by saving an empty array
      saveVisitorLog([])
      return res.status(200).json({ message: 'Visitor logs cleared successfully' })
    } catch (e) {
      console.error('Error clearing visitor logs:', e)
      return res.status(500).json({ error: 'Failed to clear visitor logs' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}