import React, { useState, useEffect, useCallback } from 'react'
import ModalPortal from './ModalPortal'

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  useEffect(() => {
    console.log('DarkModeToggle mounted')
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDark(initialDark)
    document.documentElement.classList.toggle('dark', initialDark)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newIsDark = !prev
      document.documentElement.classList.toggle('dark', newIsDark)
      localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
      return newIsDark
    })
  }, [])

  const handleMessageChange = useCallback((e) => {
    setMessage(e.target.value)
  }, [])

  const handleNameChange = useCallback((e) => {
    setName(e.target.value)
  }, [])

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    setSending(true)
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim() || 'Anonymous',
          message: message.trim() 
        })
      })

      if (response.ok) {
        setName('')
        setMessage('')
        setSentSuccess(true)
        setTimeout(() => {
          setSentSuccess(false)
          setShowMessageModal(false)
        }, 2000)
      } else {
        alert('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message')
    } finally {
      setSending(false)
    }
  }, [message, name])

  const handleOpenModal = useCallback(() => {
    setSentSuccess(false)
    setShowMessageModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSentSuccess(false)
    setShowMessageModal(false)
  }, [])

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999] flex gap-2">
        {/* Message Button */}
        <button
          onClick={handleOpenModal}
          className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-lg hover:shadow-xl dark:shadow-slate-900/50 dark:hover:shadow-slate-900/70 transform hover:scale-110 transition-all duration-200 flex items-center justify-center border-4 border-white/20 dark:border-slate-600/50 backdrop-blur-sm"
          aria-label="Send message"
          title="Send me a message"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 text-white rounded-full shadow-lg hover:shadow-xl dark:shadow-slate-900/50 dark:hover:shadow-slate-900/70 transform hover:scale-110 transition-all duration-200 flex items-center justify-center border-4 border-white/20 dark:border-slate-600/50 backdrop-blur-sm"
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* Message Modal */}
      <ModalPortal isOpen={showMessageModal} onClose={handleCloseModal}>
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div 
            className={`rounded-2xl shadow-2xl p-8 border max-w-md w-full ${
              isDark
                ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 border-slate-600/50'
                : 'bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 border-cyan-200/50'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {sentSuccess ? (
              <div className="text-center py-8">
                <div className="mb-4 flex justify-center">
                  <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-emerald-400' : 'text-cyan-800'}`}>Message Sent!</h2>
                <p className={isDark ? 'text-slate-300' : 'text-cyan-600'}>Thank you for reaching out. Your message has been received successfully.</p>
              </div>
            ) : (
              <>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-cyan-800'}`}>Send a Message</h2>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-cyan-800'}`}>Your Name <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>(optional)</span></label>
                    <input
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="Your name..."
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                        isDark
                          ? 'border-slate-600 bg-slate-700/50 text-slate-100 placeholder-slate-400 focus:ring-slate-500'
                          : 'border-cyan-200 bg-white/50 text-cyan-900 placeholder-cyan-700 focus:ring-cyan-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-cyan-800'}`}>Your Message</label>
                    <textarea
                      autoFocus
                      value={message}
                      onChange={handleMessageChange}
                      placeholder="Type your message here..."
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent min-h-[120px] resize-none ${
                        isDark
                          ? 'border-slate-600 bg-slate-700/50 text-slate-100 placeholder-slate-400 focus:ring-slate-500'
                          : 'border-cyan-200 bg-white/50 text-cyan-900 placeholder-cyan-700 focus:ring-cyan-400'
                      }`}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending...' : 'Send Message'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isDark
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </ModalPortal>
    </>
  )
}