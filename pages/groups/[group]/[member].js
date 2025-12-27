import Layout from '../../../components/Layout'
import Image from 'next/image'
const groups = require('../../../data/groups.json')

export default function Member({ member, group }) {
  if (!member) return <Layout><p>Member not found</p></Layout>
  return (
    <Layout title={`${member.name} - ${group.name} - k-taby`}>
      <div className="md:flex gap-6">
        <div className="w-48 flex-shrink-0">
          <div className="w-48 h-48 relative rounded overflow-hidden">
            <Image src={(function(){ try{ const { normalizeImage } = require('../../../lib/images'); return normalizeImage? (normalizeImage(member.image) || '/placeholder.svg') : '/placeholder.svg' }catch(e){ return '/placeholder.svg' } })()} alt={member.name} fill className="object-cover" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{member.name}</h1>
          <p className="text-gray-600">{member.role}</p>
          <p className="mt-4 text-gray-700" dangerouslySetInnerHTML={{ __html: member.bio || 'No bio available yet.' }} />
        </div>
      </div>
    </Layout>
  )
}

export async function getStaticPaths() {
  const paths = []
  for (const g of groups) {
    for (const m of g.members) {
      paths.push({ params: { group: g.id, member: m.id || encodeURIComponent(m.name) } })
    }
  }
  return { paths, fallback: true }
}

export async function getStaticProps({ params }) {
  const group = groups.find(g => g.id === params.group) || null
  if (!group) return { props: { member: null, group: null } }
  const member = group.members.find(m => (m.id || encodeURIComponent(m.name)) === params.member) || null
  return { props: { member, group } }
}
