import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import groups from '../data/groups.json'
import birthdays from '../data/birthdays.json'
import { normalizeImage } from '../lib/images'

function normalizeName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Return KST date (month, day, iso string YYYYMMDD)
function getKstDateParts() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // shift to KST
  // use UTC getters because we added the offset
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const day = now.getUTCDate()
  const iso = `${year.toString().padStart(4, '0')}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`
  return { year, month, day, iso }
}

// Simple confetti effect — canvas appended to body for a short burst
function runConfettiBurst() {
  try {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '9999'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    const DPR = window.devicePixelRatio || 1
    function resize() {
      canvas.width = Math.floor(window.innerWidth * DPR)
      canvas.height = Math.floor(window.innerHeight * DPR)
      // use setTransform to avoid accumulating scales on repeated resizes
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['#FF5DA2','#FFCA3A','#7A5CFF','#00E5FF','#1d87ee']
    const pieces = []
    // fewer pieces for performance and smoother animation
    for (let i=0;i<80;i++) {
      pieces.push({
        x: Math.random()*window.innerWidth,
        y: -10 - Math.random()*120,
        vx: (Math.random()-0.5)*5,
        vy: Math.random()*3+1.5,
        color: colors[Math.floor(Math.random()*colors.length)],
        size: Math.random()*7+5,
        rot: Math.random()*360,
        vr: (Math.random()-0.5)*8
      })
    }

    let raf
    const start = Date.now()
    function draw() {
      const t = (Date.now()-start)/1000
      // clear in CSS pixel space (canvas is scaled to DPR via setTransform)
      ctx.clearRect(0,0,window.innerWidth, window.innerHeight)
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.06 // gentler gravity
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot*Math.PI/180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6)
        ctx.restore()
      }
      if (t < 2.4) raf = requestAnimationFrame(draw)
      else {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        canvas.remove()
      }
    }
    raf = requestAnimationFrame(draw)
  } catch (e) { console.warn('Confetti failed', e) }
}

export default function BirthdayBanner({ placement = 'top' }) {
  const [today, setToday] = useState(null)
  const [matches, setMatches] = useState([])
  const ranConfetti = useRef(false)

  useEffect(() => {
    const { month, day, iso } = getKstDateParts()
    setToday({ month, day, iso })

    // build flat list of candidate birthday entries
    const cand = []
    for (const groupKey of Object.keys(birthdays)) {
      const arr = birthdays[groupKey] || []
      for (const m of arr) {
        const [y, mm, dd] = (m.birthday || '').split('-')
        if (!mm || !dd) continue
        cand.push({ groupKey, member: m.member, month: Number(mm), day: Number(dd) })
      }
    }

    // find matches for today's month/day
    const todayMatches = cand.filter(c => c.month === month && c.day === day)

    // try to enrich matches with group id, image, and link by scanning groups.json
    const enriched = todayMatches.map(m => {
      const target = normalizeName(m.member)
      for (const g of groups) {
        if (!Array.isArray(g.members)) continue
        for (const gm of g.members) {
          if (normalizeName(gm.name) === target) {
            return {
              member: m.member,
              groupName: g.name,
              groupId: g.id,
              image: normalizeImage(gm.image || g.logo || g.image || null)
            }
          }
        }
      }
      return { member: m.member, groupName: m.groupKey, groupId: null, image: null }
    })

    // filter out any dismissed banners for today
    const final = enriched.filter(e => {
      try {
        const key = `birthdayDismissed_${e.member}_${iso}`
        return !localStorage.getItem(key)
      } catch (e) { return true }
    })

    setMatches(final)
  }, [])

  useEffect(() => {
    if (!ranConfetti.current && matches.length > 0) {
      runConfettiBurst()
      ranConfetti.current = true
    }
  }, [matches])

  if (!today || matches.length === 0) return null

  function dismiss(member) {
    try {
      const key = `birthdayDismissed_${member}_${today.iso}`
      localStorage.setItem(key, '1')
    } catch (e) {}
    setMatches(prev => prev.filter(p => p.member !== member))
  }

  function dismissAll() {
    try {
      for (const m of matches) localStorage.setItem(`birthdayDismissed_${m.member}_${today.iso}`, '1')
    } catch (e) {}
    setMatches([])
  }

  return (
    <div className={`container mx-auto px-4 mb-4 ${placement === 'top' ? 'mt-4' : ''}`}>
      {matches.length === 1 && (
        <div className="relative flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-rose-50 to-rose-100 border shadow-lg birthday-glow">
          {matches[0].image ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 relative rounded-full overflow-hidden flex-shrink-0 border-2 border-white/60 shadow-md">
              <Image src={matches[0].image} alt={matches[0].member} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-200 flex items-center justify-center text-rose-800 font-bold text-lg">{(matches[0].member || '?').slice(0,1)}</div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 shadow animate-bounce text-lg">🎉</div>
              <div className="text-rose-700 kpop-font text-base md:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-ktaby-500 animate-birthday-pulse">Happy birthday!</div>
            </div>

            <div className="text-2xl md:text-4xl font-extrabold mt-1 truncate">{matches[0].member}{matches[0].groupName ? ` — ${matches[0].groupName}` : ''}</div>
            <div className="text-sm text-gray-600 mt-2">Share some love or explore their profile.</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {matches[0].groupId ? (<Link href={`/groups/${matches[0].groupId}`} className="btn btn-primary w-full sm:w-auto">Open profile</Link>) : null}
            <button onClick={() => dismiss(matches[0].member)} className="btn btn-muted btn-sm w-full sm:w-auto">Dismiss</button>
          </div>
        </div>
      )}

      {matches.length > 1 && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-rose-50 border shadow-lg birthday-glow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="mb-3 sm:mb-0">
              <div className="text-sm text-amber-700 font-medium kpop-font animate-birthday-pulse">Multiple birthdays today! 🎉</div>
              <div className="text-lg md:text-xl font-bold mt-1">Happy birthday to {matches.map((m,i)=> (i===matches.length-1 && matches.length>1) ? `and ${m.member}` : (i===0 ? m.member : `, ${m.member}`)).join('')}</div>
              <div className="text-sm text-gray-600 mt-1">Click a profile to celebrate.</div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex -space-x-3">
                {matches.map(m => (
                  <div key={m.member} className="w-10 h-10 sm:w-12 sm:h-12 relative rounded-full overflow-hidden border-2 border-white/60 shadow-sm">
                    {m.image ? <Image src={m.image} alt={m.member} fill className="object-cover" /> : <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-700">{(m.member||'?').slice(0,1)}</div>}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-3">
                <button onClick={() => dismissAll()} className="btn btn-muted w-full sm:w-auto">Dismiss all</button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {matches.map(m => m.groupId ? (<Link key={m.member} href={`/groups/${m.groupId}`} className="px-3 py-1 rounded bg-ktaby-500 text-white text-sm">{m.member}</Link>) : null)}
          </div>
        </div>
      )}
    </div>
  )
}
