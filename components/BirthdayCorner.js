import { useState, useEffect } from 'react'

export default function BirthdayCorner({ birthdays, groups }) {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([])

  useEffect(() => {
    if (!birthdays) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = []

    // Iterate through all groups and their members
    Object.entries(birthdays).forEach(([groupName, members]) => {
      if (!Array.isArray(members)) return

      members.forEach((memberData) => {
        const birthDate = memberData.birthday || memberData.birthDate
        if (!birthDate) return

        const [year, month, day] = birthDate.split('-').map(Number)
        const nextBirthday = new Date(today.getFullYear(), month - 1, day)

        // If birthday has passed this year, move to next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1)
        }

        const daysUntil = Math.floor((nextBirthday - today) / (1000 * 60 * 60 * 24))

        // Only include birthdays within 3 days
        if (daysUntil <= 3) {
          upcoming.push({
            name: memberData.member || memberData.name,
            group: groupName,
            date: birthDate,
            daysUntil,
            nextBirthday
          })
        }
      })
    })

    // Sort by days until birthday
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil)

    setUpcomingBirthdays(upcoming)
  }, [birthdays])

  if (!upcomingBirthdays || upcomingBirthdays.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">No upcoming birthdays found</p>
  }

  return (
    <div className="space-y-3">
      {upcomingBirthdays.map((birthday, idx) => {
        const date = new Date(birthday.date)
        const monthName = date.toLocaleDateString('en-US', { month: 'short' })
        const day = date.getDate()

        return (
          <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 dark:from-pink-600 dark:to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {monthName} {day}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{birthday.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{birthday.group}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {birthday.daysUntil === 0 ? '🎉 Today!' : birthday.daysUntil === 1 ? 'Tomorrow!' : `in ${birthday.daysUntil} days`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
