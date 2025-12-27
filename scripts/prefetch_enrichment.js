#!/usr/bin/env node
const { getEnrichment } = require('../lib/enrichment')
const groups = require('../data/groups.json')

async function main() {
  for (const g of groups) {
    console.log('Enriching', g.name)
    try {
      const e = await getEnrichment(g.name)
      console.log(' ->', (e && (e.albums && e.albums.length) ? `${e.albums.length} albums` : 'no albums'), (e && e.songs && e.songs.length ? `${e.songs.length} songs` : 'no songs'))
    } catch (err) {
      console.error('Failed', g.name, err)
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
