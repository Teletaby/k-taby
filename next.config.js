/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'upload.wikimedia.org',
      'images.unsplash.com',
      'images.summitmedia-digital.com',
      'scontent.fpag2-1.fna.fbcdn.net',
      'r2.theaudiodb.com',
      'encrypted-tbn0.gstatic.com',
      'images.seeklogo.com',
      'ih1.redbubble.net',
      'i.pinimg.com',
      'media.allure.com',
      'www.usmagazine.com',
      'jcacperalta.github.io',
      'www.kpop.ae',
      'c.files.bbci.co.uk',
      'nolae.eu',
      'assets.teenvogue.com',
      'i.scdn.co',
      'cdn.shopify.com',
      'static.wikia.nocookie.net',
      'kprofiles.com',
      'i.namu.wiki',
      'uploads.disquscdn.com'
    ],
    // allow CDN/Supabase hosts via remotePatterns for flexible matching
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn-images.dzcdn.net' },
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
}

module.exports = nextConfig
