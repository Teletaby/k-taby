import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Generic modal portal. Ensures a single named container and handles escape key and body scroll lock.
export default function ModalPortal({ children, onClose, id = 'modal-root' }) {
  const containerRef = useRef(null)
  const [wrapper, setWrapper] = useState(null)

  useEffect(() => {
    if (typeof document === 'undefined') return

    // create (or get) root container
    let root = document.getElementById(id)
    if (!root) {
      root = document.createElement('div')
      root.id = id
      document.body.appendChild(root)
    }

    // create a wrapper for this instance; remove any previous wrapper with same role to avoid duplicates
    const w = document.createElement('div')
    w.className = 'modal-portal'
    w.setAttribute('role', 'presentation')
    containerRef.current = w

    // remove previous album modal wrappers if mounting album-specific modal (safety)
    if (id === 'album-modal-root') {
      const prev = document.querySelectorAll('#album-modal-root > .modal-portal')
      prev.forEach(n => { if (n !== w) n.remove() })
    }

    root.appendChild(w)
    setWrapper(w)

    const prevOverflow = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'

    function onKey(e) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (w.parentNode) w.parentNode.removeChild(w)
      setWrapper(null)
    }
  }, [id, onClose])

  if (!wrapper) return null
  return createPortal(children, wrapper)
}
