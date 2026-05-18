import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { email, city } = await req.json()

    if (!email || !city) {
      return NextResponse.json({ error: 'E-Mail und Stadt sind erforderlich.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('alerts')
      .upsert(
        { email: email.toLowerCase().trim(), city: city.trim(), active: true },
        { onConflict: 'email,city', ignoreDuplicates: false },
      )

    if (error) {
      console.error('Alert upsert error:', error.message)
      return NextResponse.json({ error: 'Speichern fehlgeschlagen. Bitte versuche es erneut.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Alert route error:', err)
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
}
