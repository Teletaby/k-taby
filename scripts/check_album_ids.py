import json, re, sys
p = 'data/groups.json'
with open(p, 'r', encoding='utf8') as f:
    groups = json.load(f)

bad = []
for g in groups:
    gid = g.get('id')
    gname = g.get('name')
    aid = g.get('spotify_album_id')
    if aid:
        norm = aid.split('?')[0]
        if not re.match(r'^[A-Za-z0-9]+$', norm):
            bad.append((gid, gname, 'spotify_album_id', aid))
    s = g.get('spotify') or {}
    for a in s.get('albums', []):
        aid = a.get('id')
        if aid and not re.match(r'^[A-Za-z0-9]+$', aid):
            bad.append((gid, gname, 'spotify.albums.id', aid))
    for a in g.get('albums', []):
        aid = a.get('id')
        if aid and not re.match(r'^[A-Za-z0-9]+$', aid):
            bad.append((gid, gname, 'albums.id', aid))

if not bad:
    print('OK: no invalid-looking album ids found')
else:
    for b in bad:
        print('|'.join(map(str,b)))
    sys.exit(1)
