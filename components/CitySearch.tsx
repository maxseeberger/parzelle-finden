'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { CITIES } from '@/lib/cities'

interface PlzSuggestion {
  plz: string
  city: string
  state: string
}

export default function CitySearch() {
  const [query, setQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<typeof CITIES>([])
  const [plzSuggestion, setPlzSuggestion] = useState<PlzSuggestion | null>(null)
  const [plzLoading, setPlzLoading] = useState(false)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function lookupPlz(plz: string) {
    setPlzLoading(true)
    try {
      const res = await fetch(`https://api.zippopotam.us/de/${plz}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.places?.[0]) {
          setPlzSuggestion({
            plz,
            city: data.places[0]['place name'],
            state: data.places[0].state,
          })
          return
        }
      }
    } catch { /* ignore */ }
    setPlzSuggestion(null)
    setPlzLoading(false)
  }

  function handleInput(value: string) {
    setQuery(value)
    setPlzSuggestion(null)

    // PLZ mode: only digits
    if (/^\d+$/.test(value)) {
      setCitySuggestions([])
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (value.length >= 4) {
        setPlzLoading(true)
        debounceRef.current = setTimeout(() => lookupPlz(value.padEnd(5, '0').slice(0, 5)), 350)
      } else {
        setPlzLoading(false)
      }
      return
    }

    // City name mode
    setPlzLoading(false)
    if (value.length < 2) { setCitySuggestions([]); return }
    const filtered = CITIES.filter(c =>
      c.name.toLowerCase().includes(value.toLowerCase())
    )
    setCitySuggestions(filtered.slice(0, 6))
  }

  function selectCity(slug: string) {
    setCitySuggestions([])
    router.push(`/kleingarten-${slug}`)
  }

  function selectPlz(plz: string) {
    setPlzSuggestion(null)
    router.push(`/suche?plz=${plz}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (/^\d{4,5}$/.test(trimmed)) {
      const plz = trimmed.padEnd(5, '0')
      router.push(`/suche?plz=${plz}`)
      return
    }
    if (citySuggestions.length > 0) selectCity(citySuggestions[0].slug)
  }

  const showDropdown = citySuggestions.length > 0 || plzSuggestion || plzLoading

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Stadt oder PLZ, z.B. Berlin oder 82335..."
          className="w-full pl-12 pr-4 py-4 text-base rounded-xl border border-gray-200 shadow-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': 'var(--green-primary)' } as React.CSSProperties}
          autoComplete="off"
          inputMode="text"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          Suchen
        </button>
      </form>

      {showDropdown && (
        <ul className="absolute top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
          {/* PLZ loading */}
          {plzLoading && !plzSuggestion && (
            <li className="px-4 py-3 text-sm text-gray-400">PLZ wird aufgelöst…</li>
          )}

          {/* PLZ suggestion */}
          {plzSuggestion && (
            <li>
              <button
                onClick={() => selectPlz(plzSuggestion.plz)}
                className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: 'var(--green-primary)' }} />
                  <span className="font-semibold text-gray-900">{plzSuggestion.plz}</span>
                  <span className="text-gray-700">{plzSuggestion.city}</span>
                  <span className="text-xs text-gray-400">{plzSuggestion.state}</span>
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--green-primary)' }}>
                  Vereine in der Nähe →
                </span>
              </button>
            </li>
          )}

          {/* City suggestions */}
          {citySuggestions.map(city => (
            <li key={city.slug}>
              <button
                onClick={() => selectCity(city.slug)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-gray-900">{city.name}</span>
                <span className="text-sm text-gray-500">{city.verein_count}+ Vereine</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
