'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { CITIES } from '@/lib/cities'

export default function CitySearch() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<typeof CITIES>([])
  const router = useRouter()

  function handleInput(value: string) {
    setQuery(value)
    if (value.length < 2) { setSuggestions([]); return }
    const filtered = CITIES.filter(c =>
      c.name.toLowerCase().includes(value.toLowerCase())
    )
    setSuggestions(filtered.slice(0, 5))
  }

  function handleSelect(slug: string) {
    setSuggestions([])
    router.push(`/kleingarten-${slug}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (suggestions.length > 0) handleSelect(suggestions[0].slug)
  }

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Stadt eingeben, z.B. Berlin, München..."
          className="w-full pl-12 pr-4 py-4 text-base rounded-xl border border-gray-200 shadow-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': 'var(--green-primary)' } as React.CSSProperties}
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          Suchen
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
          {suggestions.map(city => (
            <li key={city.slug}>
              <button
                onClick={() => handleSelect(city.slug)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-gray-900">{city.name}</span>
                <span className="text-sm text-gray-500">{city.listing_count} Inserate · {city.verein_count} Vereine</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
