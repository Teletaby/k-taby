export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear the authentication cookie
  res.setHeader('Set-Cookie', 'songgame_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict')

  res.status(200).json({ success: true })
}