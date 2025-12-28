import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { normalizeImage } from '../lib/images'
import dynamic from 'next/dynamic'
const AdminControls = dynamic(() => import('./AdminControls'), { ssr: false })
const MaintenancePage = dynamic(() => import('./MaintenancePage'), { ssr: false })
import DarkModeToggle from './DarkModeToggle'
const groups = require('../data/groups.json')

export default function Layout({ children, title = 'k-taby' }) {
  // read site state lazily on the client
  // NOTE: this keeps server-side rendering fast; the maintenance message will appear for clients after mount
  const [maintenance, setMaintenance] = React.useState({ enabled: false, message: '' })
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    // Check maintenance status
    fetch('/api/admin/maintenance').then(r => r.json()).then(j => { if (j && j.maintenance) setMaintenance(j.maintenance) }).catch(() => {})

    // Check if user is admin
    fetch('/api/admin/status').then(r => r.json()).then(j => { setIsAdmin(!!j.admin) }).catch(() => {})
  }, [])

  // popup states
  const [groupsOpen, setGroupsOpen] = React.useState(false)
  const [adminModalOpen, setAdminModalOpen] = React.useState(false)

  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setGroupsOpen(false)
        setAdminModalOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Show maintenance page for non-admin users when maintenance is enabled
  if (maintenance.enabled && !isAdmin) {
    return <MaintenancePage message={maintenance.message} />
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-color)' }}>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="fixed top-0 left-0 right-0 z-50 header-accent text-white p-2 shadow-md backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between h-12">
          <Link href="/" className="font-bold text-lg tracking-tight">k-taby</Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            {/* Social links use site config with sensible fallbacks */}
            {(() => {
              let siteSocial = {}
              try { siteSocial = require('../data/site_social.json') } catch (e) { siteSocial = {} }
              const yt = (siteSocial.youtube && siteSocial.youtube.url) || '#'
              const tt = (siteSocial.tiktok && siteSocial.tiktok.url) || '#'
              return (
                <>
                  <a href={yt} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" aria-label="YouTube">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M10 15l5-3-5-3v6z"/><path d="M21.6 7.2s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1-2-.2-5-.2-5-.2s-3 .0-5 .2c-.4.1-1.3.1-2.1 1-.6.7-.8 2.3-.8 2.3S4 8.9 4 10.6v2.8c0 1.7.2 3.4.2 3.4s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.7.1 7 .2 7 .2s3.1 0 5-.2c.4-.1 1.4-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.7.2-3.4V10.6c0-1.7-.2-3.4-.2-3.4z"/></svg>
                    <span className="hidden sm:inline">YouTube</span>
                  </a>
                  <a href={tt} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" aria-label="TikTok">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M17 3v10.5A4.5 4.5 0 0 1 12.5 18 4.5 4.5 0 1 1 14 11V7h3V3h0z"/></svg>
                    <span className="hidden sm:inline">TikTok</span>
                  </a>
                </>
              )
            })()}

            <button onClick={() => setGroupsOpen(true)} aria-haspopup="dialog" aria-expanded={groupsOpen} className="flex items-center gap-2 hover:underline" aria-label="Groups">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.96.05C15.03 13.72 13.76 14 12 14s-3.03-.28-3.04-.95c-.34-.03-.67-.05-.96-.05C13.33 13 18 14.17 18 16.5V19h4v-2.5C22 14.17 17.33 13 16 13z"/></svg>
              <span className="hidden sm:inline">Groups</span>
            </button>

            <div className="ml-4">
              {/* Admin control placed here so it's visible in the top-right */}
              <AdminControls />
            </div>
          </nav>

          {/* Mobile controls: small icon buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setGroupsOpen(true)} aria-label="Open groups" className="p-1 rounded-full bg-white/10 hover:bg-white/15">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.96.05C15.03 13.72 13.76 14 12 14s-3.03-.28-3.04-.95c-.34-.03-.67-.05-.96-.05C13.33 13 18 14.17 18 16.5V19h4v-2.5C22 14.17 17.33 13 16 13z"/></svg>
            </button>
            <button onClick={() => setAdminModalOpen(true)} aria-controls="admin-modal" aria-expanded={adminModalOpen} aria-label="Admin sign in" className="p-1 rounded-full bg-white/10 hover:bg-white/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </div>
        </div>

        {/* Mobile admin modal */}
        {adminModalOpen && (
          <div id="admin-modal" className="fixed inset-0 z-[10001] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Admin sign in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAdminModalOpen(false)} />
            <div className="relative bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 z-[10002] max-h-[90vh] overflow-auto border border-cyan-200/50 dark:border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-xl bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Admin sign in</div>
                <button onClick={() => setAdminModalOpen(false)} aria-label="Close" className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div>
                <AdminControls modal onClose={() => setAdminModalOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Groups picker modal */}
      {groupsOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGroupsOpen(false)} />
            <div className="relative bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-t-lg sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl sm:w-[90%] p-4 sm:p-8 z-[10000] border border-cyan-200/50 dark:border-slate-600">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Pick a group</h3>
                <button onClick={() => setGroupsOpen(false)} className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {groups.map(g => (
                  <a key={g.id} href={`/groups/${g.id}`} className="group flex flex-col items-center gap-3 p-4 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border border-cyan-100/50 dark:border-slate-600/50">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-cyan-200/50 dark:border-slate-500/50">
                      <Image src={normalizeImage(g.logo || g.image) || '/placeholder.svg'} alt={g.name} width={80} height={80} className="object-cover object-top group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="text-sm font-medium text-cyan-700 dark:text-slate-300 text-center group-hover:text-cyan-800 dark:group-hover:text-slate-200 transition-colors duration-200">{g.name}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-4 flex-1 pt-14 md:pt-14">{children}</main>

      <footer className="border-t border-cyan-200/30 dark:border-slate-700 p-4 text-center text-sm" style={{ background: 'var(--footer-bg)', color: 'var(--footer-text)' }}>
        © {new Date().getFullYear()} taby — K-pop news & profiles
      </footer>

      <DarkModeToggle />

      <style jsx>{`
        .animate-spin-fast { animation: spin 1s linear infinite }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
