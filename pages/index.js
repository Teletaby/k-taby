import Layout from '../components/Layout'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { fetchFeed } from '../lib/rss'
import { fetchNewsForGroups } from '../lib/news'
const HeroCarousel = dynamic(() => import('../components/HeroCarousel'), { ssr: false })
const LatestNews = dynamic(() => import('../components/LatestNews'), { ssr: false })

import { useState, useEffect } from 'react'
const groups = require('../data/groups.json')
const BirthdayBanner = dynamic(() => import('../components/BirthdayBanner'), { ssr: false })

export default function Home({ items = [], mentionedGroupNames = [], siteSocial = undefined }) {
  const mentionedLabel = mentionedGroupNames.length > 0 ? `${mentionedGroupNames.length} groups mentioned` : null
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)

  return (
    <Layout>
      <HeroCarousel externalIndex={carouselIndex} onIndexChange={setCarouselIndex} externalPaused={carouselPaused} onPause={setCarouselPaused} />

      {/* Birthday banner */}
      <BirthdayBanner placement="top" />

      {/* Group quick-jump buttons */}
      <section className="mb-4">
        <div className="relative py-2">
          <div className="flex flex-wrap gap-2 sm:gap-3 px-2 sm:px-4 justify-center">
            {groups.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => { setCarouselIndex(idx); setCarouselPaused(true) }}
                aria-pressed={carouselIndex === idx}
                className={`group min-w-[84px] flex items-center gap-3 bg-white/12 hover:bg-white/20 transition-transform duration-300 ease-out transform-gpu hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg py-3 px-3 sm:py-2.5 sm:px-3 rounded-xl shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 ${carouselIndex === idx ? 'ring-2 ring-ktaby-500 scale-105' : ''}`}
                title={g.name}
              >
                <img src={(g.logo || g.image) || '/placeholder.svg'} alt={g.name} className="w-8 h-8 rounded-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="text-sm sm:text-base text-white font-semibold bg-black/90 px-3 py-1 rounded-md shadow-lg drop-shadow-md group-hover:underline underline-offset-4 decoration-ktaby-500 block truncate text-center max-w-[120px] sm:max-w-[160px]">{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-2 kpop-font">Welcome to k-taby</h1>
        <p className="text-gray-700 kpop-font">K-pop news, group & member profiles, and songs from the groups.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border rounded flex items-center gap-4 bg-white">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            <img src={(typeof siteSocial !== 'undefined' && siteSocial.youtube && siteSocial.youtube.image) ? siteSocial.youtube.image : '/placeholder.svg'} alt="@taby_edits YouTube" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Visit @taby_edits on YouTube</h2>
            <p className="text-sm text-gray-600">Click below to open my YouTube channel.</p>
            <div className="mt-3">
              <a href={(typeof siteSocial !== 'undefined' && siteSocial.youtube && siteSocial.youtube.url) ? siteSocial.youtube.url : 'https://www.youtube.com/@taby_edits'} target="_blank" rel="noreferrer" className="btn btn-yt md:w-auto">Open on YouTube →</a>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded flex items-center gap-4 bg-white">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            <img src={(typeof siteSocial !== 'undefined' && siteSocial.tiktok && siteSocial.tiktok.image) ? siteSocial.tiktok.image : '/placeholder.svg'} alt="@tabby_edits logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Visit @tabby_edits</h2>
            <p className="text-sm text-gray-600">All my TikTok edits in one place.</p>
            <div className="mt-3">
              <a href={(typeof siteSocial !== 'undefined' && siteSocial.tiktok && siteSocial.tiktok.url) ? siteSocial.tiktok.url : 'https://www.tiktok.com/@tabby_edits'} target="_blank" rel="noreferrer" className="btn btn-ktaby md:w-auto">Open on TikTok →</a>
            </div>
          </div>
        </div>
      </section>

      {/* latest news prioritized by group mentions */}
      <section className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Latest news</h2>
          {mentionedLabel && (
            <div title={mentionedGroupNames.join(', ')} className="text-xs bg-ktaby-100 text-ktaby-700 px-2 py-1 rounded">{mentionedGroupNames.length} mentioned</div>
          )}
        </div>

        <div className="space-y-4">
          <LatestNews initialItems={items} />
        </div>
      </section>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const { res } = context
  // short caching at CDN level, but always fresh on the server
  try { res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300') } catch (e) {}

  const groups = require('../data/groups.json')
  const itemsRaw = await fetchNewsForGroups(groups, { ttlMs: 1000 * 60 * 30 })

  // balance articles across groups (max 2 per group, total 6)
  const { balanceArticles } = require('../lib/news')
  const balanced = balanceArticles(itemsRaw, groups, { perGroup: 2, total: 6 })

  // collect distinct group names mentioned in the balanced set
  const mentionedSet = new Set()
  for (const it of balanced) {
    if (it._mentions && it._mentions.length) {
      for (const m of it._mentions) mentionedSet.add(m)
    }
  }
  const mentionedGroupNames = Array.from(mentionedSet)

  // No server-side TikTok preview fetch (homepage only links to profile and on-site browse).
  let siteSocial = {}
  try { siteSocial = require('../data/site_social.json') } catch (e) { siteSocial = {} }
  return { props: { items: balanced, mentionedGroupNames, siteSocial } }
}