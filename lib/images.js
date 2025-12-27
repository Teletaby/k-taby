export function normalizeImage(src) {
  if (!src) return null
  if (typeof src !== 'string') return null
  const s = src.trim()
  if (!s) return null
  // absolute URL or site-relative path
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s
  // common YouTube id (11 chars) -> convert to thumbnail
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return `https://i.ytimg.com/vi/${s}/hqdefault.jpg`
  // otherwise, not usable
  return null
}
