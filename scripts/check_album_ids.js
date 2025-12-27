const fs = require('fs')
const g = JSON.parse(fs.readFileSync('data/groups.json','utf8'))
const re = /^[A-Za-z0-9]+$/
let bad = []
for (const gr of g) {
  const gid = gr.id
  const gname = gr.name
  const aid = gr.spotify_album_id
  if (aid) {
    const norm = aid.split('?')[0]
    if (!re.test(norm)) bad.push([gid,gname,'spotify_album_id',aid])
  }
  const s = gr.spotify || {}
  for (const a of (s.albums || [])) {
    const id = a.id
    if (id && !re.test(id)) bad.push([gid,gname,'spotify.albums.id',id])
  }
  for (const a of (gr.albums || [])) {
    const id = a.id
    if (id && !re.test(id)) bad.push([gid,gname,'albums.id',id])
  }
}
if (!bad.length) console.log('OK: no invalid-looking album ids found')
else bad.forEach(b => console.log(b.join('|')))
