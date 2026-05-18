'use client'

import { useState } from 'react'

interface Props {
  /** Pre-filled city name (e.g. on a city page) */
  city?: string
  /** Visual variant */
  variant?: 'hero' | 'sidebar'
}

export default function AlertForm({ city: prefilledCity = '', variant = 'hero' }: Props) {
  const [email, setEmail] = useState('')
  const [city, setCity] = useState(prefilledCity)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Fehler beim Speichern.')
        setStatus('error')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Netzwerkfehler. Bitte versuche es erneut.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className={variant === 'sidebar' ? 'text-center py-2' : 'flex flex-col sm:flex-row gap-3 max-w-md mx-auto'}>
        <div className="w-full py-3 px-4 rounded-xl bg-green-100 text-green-800 text-sm font-medium text-center">
          ✓ Alert gesetzt! Wir melden uns sobald in {city || 'deiner Stadt'} etwas frei wird.
        </div>
      </div>
    )
  }

  if (variant === 'sidebar') {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl text-gray-900 bg-white text-sm focus:outline-none"
        />
        {!prefilledCity && (
          <input
            type="text"
            placeholder="Stadt"
            value={city}
            onChange={e => setCity(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl text-gray-900 bg-white text-sm focus:outline-none"
          />
        )}
        {errorMsg && <p className="text-red-300 text-xs">{errorMsg}</p>}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-2.5 rounded-xl font-medium text-green-900 bg-green-300 hover:bg-green-200 transition-colors text-sm disabled:opacity-60"
        >
          {status === 'loading' ? 'Speichern…' : 'Alert setzen'}
        </button>
      </form>
    )
  }

  // hero variant
  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        placeholder="deine@email.de"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="flex-1 px-4 py-3 rounded-xl text-gray-900 bg-white focus:outline-none"
      />
      {!prefilledCity && (
        <input
          type="text"
          placeholder="Stadt"
          value={city}
          onChange={e => setCity(e.target.value)}
          required
          className="sm:w-32 px-4 py-3 rounded-xl text-gray-900 bg-white focus:outline-none"
        />
      )}
      {errorMsg && (
        <p className="text-red-300 text-xs w-full text-center -mt-2">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 rounded-xl font-medium text-green-900 bg-green-300 hover:bg-green-200 transition-colors whitespace-nowrap disabled:opacity-60"
      >
        {status === 'loading' ? 'Speichern…' : 'Alert setzen'}
      </button>
    </form>
  )
}
