import { useEffect, useRef } from 'react'
import Image from 'next/image'

export default function MemberModal({ member, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!member) return
    // do not lock background scrolling — prefer outer overlay scrollbar

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    // focus close button for accessibility
    if (closeButtonRef.current) closeButtonRef.current.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [member, onClose])

  if (!member) return null

  const memberImage = (function(){ try{ const { normalizeImage } = require('../lib/images'); return normalizeImage ? (normalizeImage(member.image) || '/placeholder.svg') : '/placeholder.svg' }catch(e){ return '/placeholder.svg' } })()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <div
          className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6 z-10"
          role="dialog"
          aria-modal="true"
          aria-label={`Profile of ${member.name}`}
        >
        <button
          ref={closeButtonRef}
          className="absolute top-3 right-3 text-gray-600 text-2xl leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-32 h-40 sm:h-32 relative rounded overflow-hidden flex-shrink-0">
            <Image src={memberImage} alt={member.name} fill className="object-cover" />
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold">{member.name}</h2>
            <p className="text-sm text-gray-600">{member.role}</p>
            <div className="mt-3 text-gray-700" dangerouslySetInnerHTML={{ __html: member.bio || 'No bio available.' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
