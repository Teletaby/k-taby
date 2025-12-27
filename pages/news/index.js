import Layout from '../../components/Layout'
import { fetchFeed } from '../../lib/rss'

export default function News({ items }) {
  return (
    <Layout title="News - k-taby">
      <h1 className="text-2xl font-bold mb-4">News</h1>
      <div className="space-y-4">
        {items.length === 0 && <p className="text-gray-600">No news yet. Add RSS feed sources in config.</p>}
        {items.map(item => (
          <article key={item.link} className="p-4 border rounded">
            <a href={item.link} target="_blank" rel="noreferrer" className="text-ktaby-500 font-semibold">{item.title}</a>
            <p className="text-sm text-gray-600">{item.pubDate}</p>
            <p className="text-gray-700 mt-2" dangerouslySetInnerHTML={{ __html: item.contentSnippet || item.content || '' }} />
          </article>
        ))}
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  // config: add feeds in data/feeds.json
  const feeds = require('../../data/feeds.json')
  let items = []
  for (const feed of feeds) {
    try {
      const f = await fetchFeed(feed.url)
      items = items.concat(f.items || [])
    } catch (e) {
      console.error('feed error', feed.url, e.message)
    }
  }
  // sort by date
  items = items.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50)
  // revalidate every hour to auto-refresh news
  return { props: { items }, revalidate: 3600 }
}
