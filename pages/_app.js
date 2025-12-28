import '../styles/globals.css'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Log visitor on page load
    const logVisit = async () => {
      try {
        await fetch('/api/admin/visitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: window.location.pathname })
        })
      } catch (e) {
        // Silently fail - don't show errors to users
      }
    }

    logVisit()
  }, [router.pathname])

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
