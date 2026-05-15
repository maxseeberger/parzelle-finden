import type { WartelisteStatus } from '@/lib/supabase'

const config: Record<WartelisteStatus, { label: string; className: string }> = {
  offen: { label: 'Warteliste offen', className: 'bg-green-100 text-green-800' },
  geschlossen: { label: 'Warteliste geschlossen', className: 'bg-red-100 text-red-800' },
  unbekannt: { label: 'Status unbekannt', className: 'bg-gray-100 text-gray-600' },
}

export default function WartelisteBadge({ status }: { status: WartelisteStatus }) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
