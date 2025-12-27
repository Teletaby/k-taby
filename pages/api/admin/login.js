export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { password } = req.body || {}
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD not set' })
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok: false, error: 'Invalid password' })
  // set httpOnly cookie
  const maxAge = 60 * 60 * 24 // 1 day
  res.setHeader('Set-Cookie', `ktaby_admin=1; HttpOnly; Path=/; Max-Age=${maxAge}`)
  res.status(200).json({ ok: true })
}
