import Layout from '../../components/Layout'
import Link from 'next/link'
const groups = require('../../data/groups.json')

export default function Groups() {
  return (
    <Layout title="Groups - k-taby">
      <h1 className="text-2xl font-bold mb-4">Groups</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-gradient-to-r from-rose-50 to-amber-50">
          <h2 className="text-xl font-semibold">Visit @tabby_edits</h2>
          <p className="text-sm text-gray-600">See all my TikTok edits, filter by group hashtag like <code>#unis</code> or <code>#twice</code>.</p>
          <Link href="/tabby_edits" className="text-ktaby-500 mt-2 inline-block">Open tabby_edits →</Link>
        </div>

        {groups.map(g => (
          <div key={g.id} className="p-4 border rounded">
            <h2 className="text-xl font-semibold">{g.name}</h2>
            <p className="text-sm text-gray-600">Members: {g.members.length}</p>
            <Link href={`/groups/${g.id}`} className="text-ktaby-500 mt-2 inline-block">View →</Link>
          </div>
        ))}
      </div>
    </Layout>
  )
}
