import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeWithGemini } from '@/lib/integrations/gemini'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, type = 'weekly' } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    // Verify customer belongs to user
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get current and previous metrics
    const { data: metrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('customer_id', customerId)
      .order('calculated_at', { ascending: false })
      .limit(2)

    const current = metrics?.[0]
    const previous = metrics?.[1]

    // Get active insights
    const { data: insights } = await supabase
      .from('insights')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('detected_at', { ascending: false })
      .limit(10)

    // Build report prompt
    const currentMetricsText = current
      ? `Total Pipeline: $${(current.total_pipeline / 1000000).toFixed(2)}M
Forecast: $${(current.forecast / 1000000).toFixed(2)}M
Win Rate: ${current.win_rate.toFixed(1)}%
Avg Deal Size: $${(current.avg_deal_size / 1000).toFixed(0)}K
Avg Cycle Time: ${current.avg_cycle_time} days
Monthly Velocity: $${(current.velocity / 1000).toFixed(0)}K`
      : 'No metrics available'

    const previousMetricsText = previous
      ? `Total Pipeline: $${(previous.total_pipeline / 1000000).toFixed(2)}M
Forecast: $${(previous.forecast / 1000000).toFixed(2)}M
Win Rate: ${previous.win_rate.toFixed(1)}%
Avg Deal Size: $${(previous.avg_deal_size / 1000).toFixed(0)}K
Avg Cycle Time: ${previous.avg_cycle_time} days
Monthly Velocity: $${(previous.velocity / 1000).toFixed(0)}K`
      : 'No previous metrics available'

    const insightsText =
      insights && insights.length > 0
        ? insights
            .map(
              (insight) =>
                `[${insight.severity.toUpperCase()}] ${insight.title}: ${insight.message}`
            )
            .join('\n')
        : 'No active insights'

    const prompt = `Generate a ${type} revenue operations report.

Current Metrics:
${currentMetricsText}

Previous Period Metrics:
${previousMetricsText}

Active Insights:
${insightsText}

Provide an Executive Summary with:
1. Key Wins
2. Concerns
3. Recommendations

Format as a professional report with specific numbers and actionable insights.`

    // Generate report
    const reportContent = await analyzeWithGemini(prompt)

    // Save report
    await supabase.from('reports').insert({
      customer_id: customerId,
      type,
      content: reportContent,
    })

    return NextResponse.json({ report: reportContent })
  } catch (error: any) {
    console.error('Report API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    )
  }
}

