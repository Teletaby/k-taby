import { useState, useEffect } from 'react'

export default function MonthlyBirthdaysModal({ birthdays, groups, onClose }) {
  const [monthlyBirthdays, setMonthlyBirthdays] = useState([])

  useEffect(() => {
    // Disable scrolling when modal is open
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      // Re-enable scrolling when modal closes
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!birthdays) return

    const today = new Date()
    const currentMonth = today.getMonth() + 1 // 1-12

    const upcoming = []

    // Iterate through all groups and their members
    Object.entries(birthdays).forEach(([groupName, members]) => {
      if (!Array.isArray(members)) return

      members.forEach((memberData) => {
        const birthDate = memberData.birthday || memberData.birthDate
        if (!birthDate) return

        const [year, month, day] = birthDate.split('-').map(Number)

        // Only include members with birthdays in current month
        if (month === currentMonth) {
          upcoming.push({
            name: memberData.member || memberData.name,
            group: groupName,
            date: birthDate,
            day,
          })
        }
      })
    })

    // Sort by day
    upcoming.sort((a, b) => a.day - b.day)

    console.log('Monthly birthdays:', upcoming)
    setMonthlyBirthdays(upcoming)
  }, [birthdays])

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden max-w-md w-full max-h-[90vh] shadow-2xl flex flex-col">
          {/* Navbar Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 p-6 flex items-start justify-between border-b-2 border-blue-400/50">
            <div className="flex-1">
              <h2 className="text-2xl font-bold kpop-font text-white">
                {new Date().toLocaleDateString('en-US', { month: 'long' })} Birthdays
              </h2>
              <p className="text-sm text-blue-100 mt-1">✨ Celebrate K-pop idols this month ✨</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white hover:bg-white/20 rounded-full p-2 transition-colors ml-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            {monthlyBirthdays.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg text-gray-600 dark:text-gray-400">No birthdays this month</p>
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyBirthdays.map((birthday, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-700/30 dark:to-cyan-700/30 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-600/40 dark:hover:to-cyan-600/40 border-2 border-blue-300/50 dark:border-cyan-500/30 rounded-xl p-4 transition-all duration-300 transform hover:scale-102 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400 dark:from-blue-500 dark:via-cyan-500 dark:to-sky-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {birthday.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{birthday.name}</p>
                        <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">{birthday.group}</p>
                      </div>
                      <div className="text-2xl">🎂</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 dark:from-blue-600 dark:to-cyan-600 dark:hover:from-blue-700 dark:hover:to-cyan-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
