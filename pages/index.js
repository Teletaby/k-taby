import Layout from '../components/Layout'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { fetchFeed } from '../lib/rss'
import { fetchNewsForGroups } from '../lib/news'
import MonthlyBirthdaysModal from '../components/MonthlyBirthdaysModal'
const HeroCarousel = dynamic(() => import('../components/HeroCarousel'), { ssr: false })
const LatestNews = dynamic(() => import('../components/LatestNews'), { ssr: false })
const BirthdayBanner = dynamic(() => import('../components/BirthdayBanner'), { ssr: false })
const MemberModal = dynamic(() => import('../components/MemberModal'), { ssr: false })
const BirthdayCorner = dynamic(() => import('../components/BirthdayCorner'), { ssr: false })

import { useState, useEffect } from 'react'
const groups = require('../data/groups.json')
const birthdays = require('../data/birthdays.json')

export default function Home({ items = [], mentionedGroupNames = [], siteSocial = undefined }) {
  const mentionedLabel = mentionedGroupNames.length > 0 ? `${mentionedGroupNames.length} groups mentioned` : null
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [showMonthlyBirthdays, setShowMonthlyBirthdays] = useState(false)

  return (
    <Layout>
      <div className="mt-20">
        <HeroCarousel externalIndex={carouselIndex} onIndexChange={setCarouselIndex} externalPaused={carouselPaused} onPause={setCarouselPaused} />
        <BirthdayBanner onOpenProfile={setSelectedMember} />
      </div>

      <div className="container mx-auto p-4 pt-6">
      {/* Group quick-jump buttons */}
      <section className="mb-4 -mx-4 px-4">
        <div className="relative py-2">
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            {groups.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => { setCarouselIndex(idx); setCarouselPaused(true) }}
                aria-pressed={carouselIndex === idx}
                className={`group min-w-[84px] flex items-center gap-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-slate-700/20 dark:to-slate-600/20 hover:from-cyan-500/20 hover:to-blue-500/20 dark:hover:from-slate-600/30 dark:hover:to-slate-500/30 backdrop-blur-sm border border-cyan-200/30 dark:border-slate-600/30 transition-all duration-300 ease-out transform-gpu hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl dark:hover:shadow-slate-900/50 py-3 px-3 sm:py-2.5 sm:px-3 rounded-xl shadow-lg dark:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 dark:focus:ring-slate-400/50 ${carouselIndex === idx ? 'ring-2 ring-cyan-400 dark:ring-slate-400 scale-105 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 dark:from-slate-600/30 dark:to-slate-500/30' : ''}`}
                title={g.name}
              >
                <img src={(g.logo || g.image) || '/placeholder.svg'} alt={g.name} className="w-8 h-8 rounded-full object-cover transition-transform duration-300 group-hover:scale-105 border border-cyan-200/50 dark:border-slate-600/50" />
                <span className="text-sm sm:text-base text-cyan-800 dark:text-slate-200 font-semibold bg-white/90 dark:bg-slate-700/90 px-3 py-1 rounded-md shadow-lg drop-shadow-md group-hover:underline underline-offset-4 decoration-cyan-400 dark:decoration-cyan-300 block truncate text-center max-w-[120px] sm:max-w-[160px]">{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-2 kpop-font bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Welcome to k-taby</h1>
        <p className="text-cyan-700 dark:text-slate-300 kpop-font text-lg">K-pop news, group & member profiles, and songs from the groups.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border rounded bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src={(typeof siteSocial !== 'undefined' && siteSocial.youtube && siteSocial.youtube.image) ? siteSocial.youtube.image : '/placeholder.svg'} alt="@taby_edits YouTube" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold dark:text-white">Visit @taby_edits on YouTube</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Click below to open my YouTube channel.</p>
                <div className="mt-3">
                  <a href={(typeof siteSocial !== 'undefined' && siteSocial.youtube && siteSocial.youtube.url) ? siteSocial.youtube.url : 'https://www.youtube.com/@taby_edits'} target="_blank" rel="noreferrer" className="btn btn-yt md:w-auto">Open on YouTube →</a>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img src={(typeof siteSocial !== 'undefined' && siteSocial.tiktok && siteSocial.tiktok.image) ? siteSocial.tiktok.image : '/placeholder.svg'} alt="@tabby_edits TikTok" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold dark:text-white">Visit @tabby_edits on TikTok</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">All my edits in one place.</p>
                  <div className="mt-3">
                    <a href={(typeof siteSocial !== 'undefined' && siteSocial.tiktok && siteSocial.tiktok.url) ? siteSocial.tiktok.url : 'https://www.tiktok.com/@tabby_edits'} target="_blank" rel="noreferrer" className="btn btn-ktaby md:w-auto">Open TikTok →</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Birthday Corner</h2>
            <button onClick={() => { console.log('Button clicked'); setShowMonthlyBirthdays(true); }} className="text-sm bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white px-3 py-1 rounded transition-colors">
              Click to Check Birthday for {new Date().toLocaleDateString('en-US', { month: 'long' })}
            </button>
          </div>
          <BirthdayCorner birthdays={birthdays} groups={groups} />
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
      {selectedMember && <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
      {showMonthlyBirthdays && <MonthlyBirthdaysModal birthdays={birthdays} groups={groups} onClose={() => setShowMonthlyBirthdays(false)} />}
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const { res } = context
  // Don't cache at CDN level to ensure fresh news on reload
  try { res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=0') } catch (e) {}

  const groups = require('../data/groups.json')
  
  let balanced = []
  
  // Fetch news directly from MongoDB (always fresh)
  try {
    const { getDatabase } = await import('../lib/mongodb.js')
    const db = await getDatabase()
    const newsCollection = db.collection('news')
    const rawItems = await newsCollection.find({}).sort({ pubDate: -1 }).toArray()
    
    // Remove MongoDB metadata fields
    const itemsRaw = rawItems.map(item => {
      const { _id, fetchedAt, ...rest } = item
      return rest
    })
    
    console.log('✅ getServerSideProps: Retrieved', itemsRaw.length, 'news items from MongoDB')
    
    // balance articles across groups (max 2 per group, total 10)
    const { balanceArticles } = require('../lib/news')
    balanced = balanceArticles(itemsRaw, groups, { perGroup: 2, total: 10 })
    
    // Sort by pubDate descending
    balanced.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime()
      const dateB = new Date(b.pubDate || 0).getTime()
      return dateB - dateA
    })
  } catch (e) {
    console.error('❌ Error fetching from MongoDB, falling back to RSS:', e)
    // Fallback: fetch from sources if MongoDB is unavailable
    const itemsRaw = await fetchNewsForGroups(groups, { ttlMs: 0 })
    const { balanceArticles } = require('../lib/news')
    balanced = balanceArticles(itemsRaw, groups, { perGroup: 2, total: 10 })
  }

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