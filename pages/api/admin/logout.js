export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // clear cookie
  res.setHeader('Set-Cookie', `ktaby_admin=1; HttpOnly; Path=/; Max-Age=0`)
  res.status(200).json({ ok: true })
}
