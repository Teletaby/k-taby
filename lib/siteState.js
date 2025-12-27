import fs from 'fs'
import path from 'path'

const STATE_FILE = path.resolve(process.cwd(), 'data', 'site_state.json')

export function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return { maintenance: { enabled: false, message: '' } }
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}')
    return j
  } catch (err) {
    return { maintenance: { enabled: false, message: '' } }
  }
}

export function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('writeState failed', err)
    return false
  }
}
