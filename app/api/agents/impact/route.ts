import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agents/impact
 * Get impact metrics showing what AI agents have accomplished
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate impact metrics
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all actions in last 30 days
    const { data: actions } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('customer_id', customer.id)
      .gte('executed_at', last30Days.toISOString())

    // Get all opportunities
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .eq('customer_id', customer.id)

    // Calculate metrics
    const totalActions = actions?.length || 0
    const dataHygieneActions = actions?.filter(a => a.agent_type === 'data_hygiene').length || 0
    const dealRiskActions = actions?.filter(a => a.agent_type === 'deal_risk').length || 0
    const forecastActions = actions?.filter(a => a.agent_type === 'forecast').length || 0

    // Data quality metrics
    const totalOpportunities = opportunities?.length || 0
    const completedFields = opportunities?.reduce((sum, opp) => {
      let completed = 0
      if (opp.close_date) completed++
      if (opp.amount && opp.amount > 0) completed++
      if (opp.stage) completed++
      if (opp.probability !== null) completed++
      if (opp.owner_name) completed++
      return sum + completed
    }, 0) || 0
    const totalFields = totalOpportunities * 5 // 5 critical fields per opp
    const dataCompletenessPercent = totalFields > 0 ? (completedFields / totalFields) * 100 : 0

    // Risk metrics
    const highRiskDeals = opportunities?.filter(o => o.risk_score && o.risk_score >= 60).length || 0
    const averageRiskScore = opportunities?.reduce((sum, o) => sum + (o.risk_score || 0), 0) / totalOpportunities || 0

    // Forecast accuracy (simplified - would need historical data)
    const overdueDeals = opportunities?.filter(o => {
      if (!o.close_date) return false
      return new Date(o.close_date) < now
    }).length || 0

    const impact = {
      // Overall impact
      totalActionsLast30Days: totalActions,
      totalAIInterventions: totalActions,
      
      // Data hygiene
      pipelineHygieneScore: Math.round(dataCompletenessPercent),
      fieldsAutoFilled: dataHygieneActions,
      dataQualityImprovement: dataHygieneActions > 0 ? '+' + Math.round(dataHygieneActions / totalOpportunities * 100) + '%' : '0%',
      
      // Risk management
      highRiskDealsCount: highRiskDeals,
      averageRiskScore: Math.round(averageRiskScore),
      alertsSent: dealRiskActions,
      dealsAtRisk: highRiskDeals,
      
      // Forecast
      forecastAdjustmentsMade: forecastActions,
      overdueDealsUpdated: forecastActions,
      forecastAccuracyPercent: Math.max(0, 100 - (overdueDeals / totalOpportunities * 100)),
      
      // Breakdown by agent
      byAgent: {
        data_hygiene: dataHygieneActions,
        deal_risk: dealRiskActions,
        forecast: forecastActions,
      },
      
      // Breakdown by action type
      byActionType: actions?.reduce((acc: any, a) => {
        acc[a.action_type] = (acc[a.action_type] || 0) + 1
        return acc
      }, {}) || {},
      
      // Recent trend (last 7 days vs previous 7 days)
      last7DaysActions: actions?.filter(a => {
        const actionDate = new Date(a.executed_at!)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return actionDate >= sevenDaysAgo
      }).length || 0,
    }

    return NextResponse.json({ impact })
  } catch (error: any) {
    console.error('Failed to calculate impact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate impact' },
      { status: 500 }
    )
  }
}
