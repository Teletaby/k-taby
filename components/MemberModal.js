import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function MemberModal({ member, onClose, groupId }) {
  const closeButtonRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [isBirthday, setIsBirthday] = useState(false)

  useEffect(() => {
    if (!member) return

    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)

    // start show animation
    const t = setTimeout(() => setVisible(true), 10)

    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [member, onClose])

  useEffect(() => {
    if (visible && closeButtonRef.current) closeButtonRef.current.focus()
  }, [visible])

  // Check if it's the member's birthday
  useEffect(() => {
    if (!member) return

    try {
      // Get current date in KST
      const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // KST offset
      const todayMonth = now.getUTCMonth() + 1
      const todayDay = now.getUTCDate()

      // Check if member has birthday info
      const birthdays = require('../data/birthdays.json')
      for (const groupKey of Object.keys(birthdays)) {
        const groupBirthdays = birthdays[groupKey] || []
        for (const bday of groupBirthdays) {
          if (bday.member === member.name) {
            const [year, month, day] = (bday.birthday || '').split('-')
            if (parseInt(month) === todayMonth && parseInt(day) === todayDay) {
              setIsBirthday(true)
              return
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error checking birthday:', e)
    }
    setIsBirthday(false)
  }, [member])

  function handleClose() {
    setVisible(false)
    setTimeout(() => { if (onClose) onClose() }, 200)
  }

  if (!member) return null

  const memberImage = (function(){ try{ const { normalizeImage } = require('../lib/images'); return normalizeImage ? (normalizeImage(member.image) || '/placeholder.svg') : '/placeholder.svg' }catch(e){ return '/placeholder.svg' } })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={`Profile of ${member.name}`}>
      <div className={'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ' + (visible ? 'opacity-100' : 'opacity-0')} onClick={handleClose} />
      <div
        className={'relative bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 rounded-2xl shadow-2xl max-w-sm sm:max-w-xl md:max-w-4xl w-full mx-4 p-4 sm:p-6 md:p-8 z-10 transform-gpu transition-all duration-300 ease-out border border-cyan-200/50 dark:border-slate-600/50 ' + (visible ? 'opacity-100 scale-100 translate-y-0 animate-modal-open' : 'opacity-0 scale-95 translate-y-3') + ' max-h-[90vh] overflow-hidden'}
        role="dialog"
        aria-modal="true"
        aria-label={`Profile of ${member.name}`}
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-cyan-200/30 to-blue-300/30 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-blue-200/20 to-purple-300/20 rounded-full blur-xl"></div>
        </div>

        {/* Close button */}
        <button
          ref={closeButtonRef}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-20 group"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Main content */}
        <div className="relative z-10 flex flex-col lg:flex-row items-start gap-4 sm:gap-6 lg:gap-8 h-full overflow-y-auto">
          {/* Member image section */}
          <div className="flex-shrink-0 w-full max-w-xs sm:max-w-sm lg:w-80 mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative rounded-2xl overflow-hidden pb-[100%] bg-gradient-to-br from-cyan-100 to-blue-100 shadow-xl border-2 border-cyan-200/50">
              <Image src={memberImage} alt={member.name} fill className="object-cover object-top" />
            </div>

            {/* Decorative elements */}
            <div className="flex justify-center mt-4 space-x-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>

          {/* Member info section */}
          <div className="flex-1 min-h-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-200/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">{member.name}</h2>
                  <p className="text-cyan-600 dark:text-cyan-400 font-medium text-sm sm:text-base lg:text-lg">{member.role}</p>
                </div>
              </div>

              <div className="prose prose-cyan max-w-none">
                <div className="bg-white/50 dark:bg-slate-700/50 rounded-lg p-4 border border-cyan-100/50 dark:border-slate-600/50">
                  <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-300 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About
                  </h3>
                  <div className="text-gray-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: member.bio || 'No bio available.' }} />
                </div>
                {member.description && (
                  <div className="bg-orange-50/50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200/50 dark:border-orange-700/50 mt-3">
                    <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Why Former Member
                    </h3>
                    <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-sm">{member.description}</p>
                  </div>
                )}
              </div>

              {/* Birthday Celebration */}
              {isBirthday && (
                <div className="mt-4 sm:mt-6 bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 dark:from-rose-900/20 dark:via-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 sm:p-6 border-2 border-rose-200/50 dark:border-rose-700/50 shadow-lg animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="text-2xl sm:text-3xl md:text-4xl animate-bounce">🎉</div>
                      <div className="text-xl sm:text-2xl md:text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎂</div>
                      <div className="text-2xl sm:text-3xl md:text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</div>
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
                      Happy Birthday, {member.name}! 🎈
                    </h3>
                    <p className="text-rose-700 dark:text-rose-300 font-medium text-sm sm:text-base">
                      Wishing you an amazing day filled with love, success, and all your favorite K-pop moments! 💖
                    </p>
                    <div className="flex justify-center gap-2 mt-3 sm:mt-4">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-rose-400 dark:bg-rose-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-pink-400 dark:bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 dark:bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
