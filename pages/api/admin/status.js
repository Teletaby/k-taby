function isAdminFromReq(req) {
  const c = req.headers.cookie || ''
  return c.split(/;\s*/).some(x => x.trim() === 'ktaby_admin=1')
}
export default function handler(req, res) {
  const admin = isAdminFromReq(req)
  res.status(200).json({ admin })
}
