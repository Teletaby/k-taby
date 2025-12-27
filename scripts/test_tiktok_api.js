(async()=>{
  const uid='7566333233005265940'
  const url=`https://www.tiktok.com/api/post/item_list/?user_id=${uid}&count=12`
  console.log('GET',url)
  try{
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://www.tiktok.com/' } })
    console.log('status', r.status)
    const t = await r.text()
    console.log('body len', t.length)
    console.log(t.slice(0,1200))
  } catch (e) { console.error('err', e.message) }
})().catch(e=>{ console.error(e); process.exit(1) })