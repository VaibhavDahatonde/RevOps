import type { Opportunity } from '../types/database'

export function exportToCSV(opportunities: Opportunity[], filename: string = 'opportunities.csv') {
  // Define CSV headers
  const headers = [
    'Name',
    'Stage',
    'Amount',
    'Close Date',
    'Owner',
    'Account',
    'Source',
    'Created At'
  ]

  // Convert opportunities to CSV rows
  const rows = opportunities.map(opp => [
    opp.name,
    opp.stage || 'N/A',
    opp.amount?.toString() || '0',
    opp.close_date || 'N/A',
    opp.owner_name || 'N/A',
    opp.account_name || 'N/A',
    opp.source,
    opp.created_at || 'N/A'
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
