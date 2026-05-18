/**
 * Alert Notification Script
 *
 * Runs nightly via GitHub Actions. Finds listings posted in the last 25 hours,
 * matches them against active alert subscriptions, and sends one digest email
 * per subscriber via Resend.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL (default: "alerts@parzelle-finden.de")
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'alerts@parzelle-finden.de'

interface Listing {
  id: string
  title: string
  city: string
  price_abloese?: number
  size_sqm?: number
  contact_url?: string
  posted_at: string
}

interface Alert {
  email: string
  city: string
}

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

function cityMatch(listingCity: string, alertCity: string): boolean {
  const lc = normalise(listingCity)
  const ac = normalise(alertCity)
  return lc.includes(ac) || ac.includes(lc)
}

function formatPrice(p?: number) {
  return p ? `€${p.toLocaleString('de-DE')}` : 'Preis auf Anfrage'
}

function buildEmailHtml(city: string, listings: Listing[], unsubToken: string): string {
  const rows = listings.map(l => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <a href="${l.contact_url ?? '#'}" style="font-weight:600;color:#1b4332;text-decoration:none;font-size:15px;">${l.title}</a><br/>
        <span style="color:#6b7280;font-size:13px;">
          ${l.size_sqm ? `${l.size_sqm} m² · ` : ''}${formatPrice(l.price_abloese)}
        </span>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <tr><td style="background:linear-gradient(135deg,#1b4332,#2d6a4f);padding:28px 32px;">
    <p style="margin:0;color:#95d5b2;font-size:13px;font-weight:600;">parzelle-finden.de</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">${listings.length} neue${listings.length === 1 ? 'r' : ''} Kleingarten in ${city}</h1>
  </td></tr>
  <tr><td style="padding:24px 32px;">
    <p style="margin:0 0 16px;color:#374151;font-size:15px;">
      Dein Alert für <strong>${city}</strong> hat angeschlagen. Hier sind die neuesten Inserate:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <p style="margin:24px 0 0;text-align:center;">
      <a href="https://parzelle-finden.de/kleingarten-${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}"
         style="display:inline-block;padding:12px 28px;background:#1b4332;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px;">
        Alle Inserate in ${city} ansehen →
      </a>
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">
      Du erhältst diese E-Mail, weil du einen Alert für ${city} auf parzelle-finden.de gesetzt hast.<br/>
      <a href="https://parzelle-finden.de/api/unsubscribe?token=${unsubToken}" style="color:#6b7280;">Abmelden</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

async function main() {
  console.log('🔔 Alert notification run started')

  // Fetch new listings from last 25 hours (25h to avoid missing any across cron drift)
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  const { data: listings, error: listErr } = await supabase
    .from('listings')
    .select('id,title,city,price_abloese,size_sqm,contact_url,posted_at')
    .eq('active', true)
    .neq('city', 'Unbekannt')
    .gte('scraped_at', since)

  if (listErr) { console.error('Listings query failed:', listErr.message); process.exit(1) }
  if (!listings || listings.length === 0) { console.log('No new listings — nothing to send.'); return }
  console.log(`Found ${listings.length} new listings`)

  // Fetch all active alerts
  const { data: alerts, error: alertErr } = await supabase
    .from('alerts')
    .select('email,city')
    .eq('active', true)

  if (alertErr) { console.error('Alerts query failed:', alertErr.message); process.exit(1) }
  if (!alerts || alerts.length === 0) { console.log('No active alerts.'); return }
  console.log(`Found ${alerts.length} active alerts`)

  // Group alerts by email so we send at most one email per subscriber
  const byEmail = new Map<string, Alert[]>()
  for (const alert of alerts as Alert[]) {
    const existing = byEmail.get(alert.email) ?? []
    existing.push(alert)
    byEmail.set(alert.email, existing)
  }

  let sent = 0
  for (const [email, userAlerts] of byEmail) {
    // Collect all matching listings for this user across their subscribed cities
    const perCity = new Map<string, Listing[]>()
    for (const alert of userAlerts) {
      const matching = (listings as Listing[]).filter(l => cityMatch(l.city, alert.city))
      if (matching.length > 0) perCity.set(alert.city, matching)
    }
    if (perCity.size === 0) continue

    // One email per city (keeps emails targeted and short)
    for (const [city, cityListings] of perCity) {
      // Simple unsubscribe token (email+city base64 — replace with signed JWT in production)
      const unsubToken = Buffer.from(`${email}::${city}`).toString('base64url')
      const html = buildEmailHtml(city, cityListings.slice(0, 10), unsubToken)

      try {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `${cityListings.length} neue${cityListings.length === 1 ? 'r' : ''} Kleingarten in ${city} 🌱`,
          html,
        })
        console.log(`✉️  Sent to ${email} for ${city} (${cityListings.length} listings)`)
        sent++
      } catch (e) {
        console.error(`Failed to send to ${email}:`, e)
      }

      // Resend rate limit: ~10 req/s on free tier
      await new Promise(r => setTimeout(r, 150))
    }
  }

  console.log(`✅ Done — ${sent} emails sent`)
}

main().catch(e => { console.error(e); process.exit(1) })
