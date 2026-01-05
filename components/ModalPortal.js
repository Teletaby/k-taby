import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Track number of open modals globally to handle scroll lock correctly
let openModalCount = 0

// Generic modal portal. Ensures a single named container and handles escape key and body scroll lock.
export default function ModalPortal({ children, onClose, isOpen = true, id = 'modal-root' }) {
  const containerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)

  // Keep onClose ref updated
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined' || !mounted) return

    if (isOpen) {
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
      setReady(true)

      // Increment modal count and disable scrolling
      openModalCount++
      const htmlElement = document.documentElement
      htmlElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'

      function onKey(e) {
        if (e.key === 'Escape' && onCloseRef.current) onCloseRef.current()
      }
      document.addEventListener('keydown', onKey)

      return () => {
        document.removeEventListener('keydown', onKey)
        if (w.parentNode) w.parentNode.removeChild(w)
        
        // Decrement modal count and re-enable scrolling if no modals are open
        openModalCount--
        if (openModalCount <= 0) {
          openModalCount = 0
          const htmlElement = document.documentElement
          htmlElement.style.overflow = ''
          document.body.style.overflow = ''
        }
      }
    } else {
      setReady(false)
    }
  }, [id, isOpen, mounted])

  if (!mounted || !ready || !containerRef.current || !isOpen) {
    return null
  }
  return createPortal(children, containerRef.current)
}
