import Error from 'next/error'

export default function ErrorPage({ statusCode }) {
  // Minimal wrapper around Next's Error so dev overlay always has a component to render
  return <Error statusCode={statusCode} />
}
