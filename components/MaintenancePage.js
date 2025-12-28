import Head from 'next/head'

export default function MaintenancePage({ message }) {

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/30">
      <Head>
        <title>Maintenance - k-taby</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-cyan-200/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-blue-200/20 to-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-300/10 to-blue-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="max-w-2xl w-full text-center">
          {/* K-pop themed logo/icon */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full shadow-2xl flex items-center justify-center mb-6">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>

            {/* Static K-pop icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-200/30"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">♪</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-cyan-200/50">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
              K-taby
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-cyan-800 mb-6">
              Under Maintenance
            </h2>

            <div className="text-lg text-cyan-700 mb-8 leading-relaxed">
              {message || "We're currently performing some maintenance to bring you the best K-pop experience. We'll be back soon!"}
            </div>

            {/* Loading dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              </div>
              <span className="text-cyan-600 font-medium ml-2">Working on it...</span>
            </div>

            {/* Fun K-pop facts or messages */}
            <div className="text-sm text-cyan-600/80 italic">
              "While you wait, why not practice your favorite K-pop choreography? 💃🕺"
            </div>
          </div>

          {/* Decorative elements */}
          <div className="flex justify-center gap-4 mt-8">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}