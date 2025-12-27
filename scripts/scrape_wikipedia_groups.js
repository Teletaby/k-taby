/*
Scrape member names from each group's Wikipedia page and populate data/groups.json.
- Tries infobox 'Members' row, then 'Members' section lists.
- Keeps member objects as { "name": "Full Name" }.

Usage:
  node scripts/scrape_wikipedia_groups.js --group=<groupId>
  or
  node scripts/scrape_wikipedia_groups.js

Note: Uses public Wikipedia content (CC BY-SA); attribute accordingly in the site.
*/

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const cheerio = require('cheerio')

const groupsPath = path.join(__dirname, '..', 'data', 'groups.json')
let groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'))

const args = process.argv.slice(2)
const argObj = {}
args.forEach(a => {
  const [k,v] = a.replace(/^--/, '').split('=')
  argObj[k] = v || true
})

function variants(name) {
  name = name.trim()
  const base = name.replace(/\s+/g, '_')
  const variants = [base, base.charAt(0).toUpperCase() + base.slice(1), base.toLowerCase(), base.toUpperCase()]
  // de-accent some common forms
  variants.push(base.replace(/[^A-Za-z0-9_]/g, ''))
  return Array.from(new Set(variants))
}

async function fetchHtmlForTitle(titleVar) {
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(titleVar)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'k-taby-bot/1.0 (contact: your-email@example.com)' }})
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    return null
  }
}

function parseMembersFromHtml(html) {
  const $ = cheerio.load(html)
  let members = []

  // 1) Try infobox table rows
  $('.infobox tr').each((i, tr) => {
    const th = $(tr).find('th').first().text().trim()
    if (/members?/i.test(th)) {
      const td = $(tr).find('td').first()
      td.find('a').each((i, a) => {
        const name = $(a).text().trim()
        if (name) members.push(name)
      })
      if (members.length === 0) {
        // fallback: split text
        const txt = td.text().trim()
        txt.split(/[\n,·•;\/]/).forEach(s => {
          const n = s.trim()
          if (n) members.push(n)
        })
      }
    }
  })

  // 2) Try 'Members' section list
  if (members.length === 0) {
    const headline = $('span.mw-headline').filter((i, el) => /members?/i.test($(el).text()))
    if (headline.length) {
      const h = headline.first()
      // look for following ul
      let ul = h.closest('h2, h3').next()
      while (ul && ul.length && ul[0].name !== 'ul' && ul[0].name !== 'p') {
        ul = ul.next()
      }
      if (ul && ul[0] && ul[0].name === 'ul') {
        ul.find('li').each((i, li) => {
          const a = $(li).find('a').first()
          if (a.length) {
        const name = a.text().trim()
        const href = a.attr('href')
        if (href && href.startsWith('/wiki/')) {
          members.push({ name, source: `https://en.wikipedia.org${href}` })
        } else {
          members.push(name)
        }
      } else {
        const txt = $(li).text().trim().split(/[-–—]/)[0].trim()
        if (txt) members.push(txt)
      }
        })
      } else if (ul && ul[0] && ul[0].name === 'p') {
        ul.find('a').each((i, a) => members.push($(a).text().trim()))
      }
    }
  }

  // 3) Deduplicate and normalize
  members = members.map(m => m.replace(/\[[^\]]+\]/g, '').trim()).filter(Boolean)
  members = Array.from(new Set(members))
  return members
}

async function run() {
  for (const g of groups) {
    if (argObj.group && argObj.group !== g.id) continue
    // skip if already has members
    if (!argObj.force && g.members && g.members.length > 0) {
      console.log(`Skipping ${g.name}: already has ${g.members.length} member(s).`)
      continue
    }

    console.log(`Fetching members for ${g.name} ...`)
    let found = []
    const tries = variants(g.name)
    for (const t of tries) {
      const html = await fetchHtmlForTitle(t)
      if (!html) continue
      const members = parseMembersFromHtml(html)
      if (members.length) {
        found = members
        console.log(`  -> Found ${members.length} via ${t}`)
        break
      }
      // small delay
      await new Promise(r => setTimeout(r, 400))
    }

    if (found.length === 0) {
      console.log(`  ! No members found for ${g.name}; leaving empty.`)
      g.members = []
    } else {
      // normalize found entries into { name, source? }
      g.members = found.map(item => typeof item === 'string' ? { name: item } : item)
    }
    // be gentle with Wikipedia
    await new Promise(r => setTimeout(r, 800))
  }

  fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 2), 'utf8')
  console.log('Updated data/groups.json')
}

run()
