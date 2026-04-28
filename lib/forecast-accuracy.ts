import { createClient } from '@/lib/supabase/server'

export interface ForecastAccuracyData {
  currentAccuracy: number
  previousAccuracy: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  totalDeals: number
  accurateForecasts: number
  monthlyData: Array<{
    month: string
    accuracy: number
    deals: number
  }>
  drivers: Array<{
    name: string
    impact: number
  }>
}

/**
 * Calculate forecast accuracy by comparing predicted close dates vs actual close dates
 * A forecast is "accurate" if the deal closed within 7 days of the predicted close date
 */
export async function calculateForecastAccuracy(
  customerId: string,
  daysRange: number = 90
): Promise<ForecastAccuracyData> {
  const supabase = await createClient()

  // Get closed deals from the last N days
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysRange)

  const { data: closedDeals, error } = await supabase
    .from('closed_deals')
    .select('*')
    .eq('customer_id', customerId)
    .gte('close_date', startDate.toISOString().split('T')[0])
    .order('close_date', { ascending: false })

  if (error) {
    console.error('Error fetching closed deals:', error)
    return getDefaultAccuracyData()
  }

  if (!closedDeals || closedDeals.length === 0) {
    return getDefaultAccuracyData()
  }

  // For each closed deal, check if there was an opportunity with predicted close date
  const accuracyResults = await Promise.all(
    closedDeals.map(async (deal) => {
      // Find the opportunity that matches this closed deal
      const { data: opp } = await supabase
        .from('opportunities')
        .select('close_date, amount, stage')
        .eq('customer_id', customerId)
        .eq('external_id', deal.external_id)
        .single()

      if (!opp || !opp.close_date) {
        return null
      }

      // Calculate accuracy: deal is accurate if closed within 7 days of prediction
      const predictedDate = new Date(opp.close_date)
      const actualDate = new Date(deal.close_date)
      const diffDays = Math.abs(
        (actualDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        accurate: diffDays <= 7,
        diffDays,
        amount: deal.amount,
        closeDate: deal.close_date,
      }
    })
  )

  const validResults = accuracyResults.filter((r) => r !== null)
  const accurateForecasts = validResults.filter((r) => r.accurate).length
  const totalDeals = validResults.length

  const currentAccuracy = totalDeals > 0 ? (accurateForecasts / totalDeals) * 100 : 0

  // Calculate previous period accuracy for trend
  const previousStartDate = new Date(startDate)
  previousStartDate.setDate(previousStartDate.getDate() - daysRange)

  const { data: previousDeals } = await supabase
    .from('closed_deals')
    .select('*')
    .eq('customer_id', customerId)
    .gte('close_date', previousStartDate.toISOString().split('T')[0])
    .lt('close_date', startDate.toISOString().split('T')[0])

  let previousAccuracy = 0
  if (previousDeals && previousDeals.length > 0) {
    const prevResults = await Promise.all(
      previousDeals.map(async (deal) => {
        const { data: opp } = await supabase
          .from('opportunities')
          .select('close_date')
          .eq('customer_id', customerId)
          .eq('external_id', deal.external_id)
          .single()

        if (!opp || !opp.close_date) return null

        const predictedDate = new Date(opp.close_date)
        const actualDate = new Date(deal.close_date)
        const diffDays = Math.abs(
          (actualDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        return diffDays <= 7
      })
    )

    const prevValid = prevResults.filter((r) => r !== null)
    const prevAccurate = prevResults.filter((r) => r === true).length
    previousAccuracy = prevValid.length > 0 ? (prevAccurate / prevValid.length) * 100 : 0
  }

  // Calculate trend
  const trendPercentage = currentAccuracy - previousAccuracy
  const trend =
    Math.abs(trendPercentage) < 2 ? 'stable' : trendPercentage > 0 ? 'up' : 'down'

  // Calculate monthly accuracy for chart
  const monthlyData = calculateMonthlyAccuracy(validResults)

  // Calculate accuracy drivers (mock data - we'd need more engagement data to calculate real drivers)
  const drivers = [
    { name: 'Email engagement', impact: 35 },
    { name: 'Call frequency', impact: 28 },
    { name: 'Meeting attendance', impact: 22 },
    { name: 'Response time', impact: 15 },
  ]

  return {
    currentAccuracy: Math.round(currentAccuracy * 10) / 10,
    previousAccuracy: Math.round(previousAccuracy * 10) / 10,
    trend,
    trendPercentage: Math.round(Math.abs(trendPercentage) * 10) / 10,
    totalDeals,
    accurateForecasts,
    monthlyData,
    drivers,
  }
}

function calculateMonthlyAccuracy(
  results: Array<{ accurate: boolean; closeDate: string }>
): Array<{ month: string; accuracy: number; deals: number }> {
  const monthlyMap = new Map<string, { accurate: number; total: number }>()

  results.forEach((result) => {
    const date = new Date(result.closeDate)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { accurate: 0, total: 0 })
    }

    const data = monthlyMap.get(monthKey)!
    data.total++
    if (result.accurate) data.accurate++
  })

  // Convert to array and format
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6) // Last 6 months
    .map(([key, data]) => {
      const [year, month] = key.split('-')
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        accuracy: Math.round((data.accurate / data.total) * 100),
        deals: data.total,
      }
    })
}

function getDefaultAccuracyData(): ForecastAccuracyData {
  return {
    currentAccuracy: 0,
    previousAccuracy: 0,
    trend: 'stable',
    trendPercentage: 0,
    totalDeals: 0,
    accurateForecasts: 0,
    monthlyData: [],
    drivers: [
      { name: 'Email engagement', impact: 35 },
      { name: 'Call frequency', impact: 28 },
      { name: 'Meeting attendance', impact: 22 },
      { name: 'Response time', impact: 15 },
    ],
  }
}
