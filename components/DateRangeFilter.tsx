'use client'

import { Calendar } from 'lucide-react'

interface DateRangeFilterProps {
  value: string
  onChange: (range: string) => void
}

const ranges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        {ranges.map((range) => (
          <option key={range.value} value={range.value} className="bg-slate-900">
            {range.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function getDateRangeFilter(range: string): Date | null {
  const now = new Date()
  
  switch (range) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7))
    case '30d':
      return new Date(now.setDate(now.getDate() - 30))
    case '90d':
      return new Date(now.setDate(now.getDate() - 90))
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), quarter * 3, 1)
    case 'year':
      return new Date(now.getFullYear(), 0, 1)
    case 'all':
    default:
      return null
  }
}
