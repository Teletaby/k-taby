/*
Simple script to populate member bios & images from Wikipedia.
Usage:
  node scripts/fetch_members.js --group=<groupId>
  or
  node scripts/fetch_members.js           (will attempt all groups that have members listed)

This uses public Wikipedia extracts and Wikimedia main images (if available).
License: Wikipedia/Wikimedia content must be credited and used per their licenses.
*/

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

const groupsPath = path.join(__dirname, '..', 'data', 'groups.json')
let groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'))

const args = process.argv.slice(2)
const argObj = {}
args.forEach(a => {
  const [k,v] = a.replace(/^--/, '').split('=')
  argObj[k] = v || true
})

async function fetchWikiSummary(member) {
  // member may be a string (name) or an object with .name and optional .source (full wikipedia url)
  let title
  if (member && member.source && typeof member.source === 'string') {
    try {
      const u = new URL(member.source)
      title = u.pathname.split('/').pop()
    } catch (e) {
      title = (member.name || member).replace(/ /g, '_')
    }
  } else {
    title = (member.name || member).replace(/ /g, '_')
  }
  const wikiTitle = encodeURIComponent(title)
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`
  const res = await fetch(url, { headers: { 'User-Agent': 'k-taby-bot/1.0 (contact: your-email@example.com)'}})
  if (!res.ok) return null
  const j = await res.json()
  return {
    bio: j.extract_html || j.extract || '',
    image: j.originalimage && j.originalimage.source ? j.originalimage.source : (j.thumbnail && j.thumbnail.source ? j.thumbnail.source : null),
    source: j.content_urls ? j.content_urls.desktop.page : `https://en.wikipedia.org/wiki/${wikiTitle}`
  }
}

async function run() {
  for (const g of groups) {
    if (argObj.group && argObj.group !== g.id) continue
    if (!g.members || g.members.length === 0) {
      console.log(`Skipping ${g.name}, no members listed.`)
      continue
    }
    console.log(`Processing ${g.name} (${g.members.length} members)`)
    for (let i=0;i<g.members.length;i++) {
      const m = g.members[i]
      try {
        const summary = await fetchWikiSummary(m)
        if (summary) {
          g.members[i] = { ...m, bio: summary.bio, image: summary.image, source: summary.source }
          console.log(`Fetched ${m.name}`)
        } else {
          console.log(`No Wikipedia summary for ${m.name}`)
        }
        // be gentle
        await new Promise(r => setTimeout(r, 700))
      } catch (e) {
        console.error('error fetching', m.name, e.message)
      }
    }
  }
  fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 2), 'utf8')
  console.log('Updated groups.json')
}

run()
