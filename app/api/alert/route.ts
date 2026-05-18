import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM_EMAIL ?? 'alerts@parzelle-finden.de'

function confirmationHtml(city: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <tr><td style="background:linear-gradient(135deg,#1b4332,#2d6a4f);padding:28px 32px;text-align:center;">
    <p style="margin:0;color:#95d5b2;font-size:13px;font-weight:600;">parzelle-finden.de</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">Alert gesetzt ✓</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;text-align:center;">
    <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
      Wir benachrichtigen dich per E-Mail, sobald in <strong>${city}</strong> ein neuer Kleingarten verfügbar wird.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Du musst nichts weiter tun — wir prüfen täglich neue Inserate für dich.
    </p>
    <a href="https://parzelle-finden.de/kleingarten-${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}"
       style="display:inline-block;padding:12px 28px;background:#1b4332;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px;">
      Aktuelle Inserate in ${city} ansehen →
    </a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">
      parzelle-finden.de · Fischackerweg 5A, 82335 Berg<br/>
      Du erhältst diese E-Mail, weil du einen Alert gesetzt hast. Kein Spam — versprochen.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

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

    const cleanEmail = email.toLowerCase().trim()
    const cleanCity = city.trim()

    const { error, data } = await supabase
      .from('alerts')
      .upsert(
        { email: cleanEmail, city: cleanCity, active: true },
        { onConflict: 'email,city', ignoreDuplicates: true },
      )
      .select('id')

    if (error) {
      console.error('Alert upsert error:', error.message)
      return NextResponse.json({ error: 'Speichern fehlgeschlagen. Bitte versuche es erneut.' }, { status: 500 })
    }

    // Send confirmation email (fire-and-forget, don't block the response)
    if (resend && data && data.length > 0) {
      resend.emails.send({
        from: FROM,
        to: cleanEmail,
        subject: `Alert gesetzt: Kleingarten in ${cleanCity} 🌱`,
        html: confirmationHtml(cleanCity),
      }).catch(e => console.error('Confirmation email failed:', e))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Alert route error:', err)
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
}
