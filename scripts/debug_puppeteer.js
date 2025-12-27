(async ()=>{
  const puppeteer = require('puppeteer')
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'], headless: true })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    await page.goto('https://www.tiktok.com/@tabby_edits', { waitUntil: 'networkidle2', timeout: 30000 })
    await page.waitForTimeout(2000)
    const hrefs = await page.$$eval('a[href*="/video/"]', as => as.map(a=>a.href).slice(0,50))
    const scripts = await page.$$eval('script', s => s.map(x=> ({ type: x.type || '', text: x.textContent || '' })))
    const interesting = scripts.filter(s => /uniqueId|userId|author|itemList|video|SIGI_STATE|__INIT_PROPS|__INITIAL_STATE/i.test(s.text))
    const windowKeys = await page.evaluate(() => Object.keys(window).filter(k=> /SIGI|INIT|__DATA__|video/i.test(k)))
    const bodySample = await page.evaluate(()=>document.querySelector('body')?.innerText?.slice(0,1000) || '')
    console.log('hrefs count', hrefs.length)
    console.log('hrefs sample', hrefs.slice(0,10))
    console.log('window keys sample', windowKeys)
    console.log('interesting scripts count', interesting.length)
    if (interesting.length > 0) {
      for (let si=0; si<interesting.length; si++) {
        const s = interesting[si]
        console.log('--- script', si, 'len', s.text.length)
        const nums = Array.from(new Set((s.text.match(/(\d{6,25})/g) || []))).slice(0,200)
        console.log('found numeric tokens count', nums.length)
        console.log(nums.slice(0,20))
        for (let i=0;i<Math.min(6, nums.length); i++) {
          const token = nums[i]
          const idx = s.text.indexOf(token)
          console.log('--- token', i, token, 'context:', s.text.slice(Math.max(0, idx-40), idx+40))
        }
      }
    }
    console.log('body sample starts:', bodySample.slice(0,200))
    await page.close()
  } catch (e) {
    console.error('err', e.message)
  } finally {
    await browser.close()
  }
})().catch(e=>{console.error(e);process.exit(1)})