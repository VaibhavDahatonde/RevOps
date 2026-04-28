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
    const { customerId, question } = body

    if (!customerId || !question) {
      return NextResponse.json(
        { error: 'customerId and question required' },
        { status: 400 }
      )
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

    // Get metrics
    const { data: metrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('customer_id', customerId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    // Get top opportunities
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .eq('customer_id', customerId)
      .order('amount', { ascending: false })
      .limit(10)

    // Build context prompt
    const metricsText = metrics
      ? `Total Pipeline: $${(metrics.total_pipeline / 1000000).toFixed(2)}M
Forecast: $${(metrics.forecast / 1000000).toFixed(2)}M
Win Rate: ${metrics.win_rate.toFixed(1)}%
Avg Deal Size: $${(metrics.avg_deal_size / 1000).toFixed(0)}K
Avg Cycle Time: ${metrics.avg_cycle_time} days
Monthly Velocity: $${(metrics.velocity / 1000).toFixed(0)}K`
      : 'No metrics available'

    const opportunitiesText =
      opportunities && opportunities.length > 0
        ? opportunities
            .map(
              (opp, idx) =>
                `${idx + 1}. ${opp.name} - $${(opp.amount / 1000).toFixed(0)}K - Stage: ${opp.stage || 'N/A'} - Close Date: ${opp.close_date || 'N/A'}`
            )
            .join('\n')
        : 'No opportunities available'

    const prompt = `You are analyzing RevOps data for a revenue operations dashboard.

Current Metrics:
${metricsText}

Top 10 Opportunities:
${opportunitiesText}

Question: ${question}

Provide a data-driven answer with specific numbers from the metrics and opportunities above. Be concise and actionable.`

    // Call Gemini
    const answer = await analyzeWithGemini(prompt)

    // Save to chat history
    await supabase.from('chat_history').insert({
      customer_id: customerId,
      question,
      answer,
    })

    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error('Query API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    )
  }
}

