import type { Opportunity } from './types/database'

export interface RiskFactors {
  staleActivityScore: number
  velocityScore: number
  stageTimeScore: number
  missingDataScore: number
}

export interface RiskAnalysis {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  factors: RiskFactors
  daysSinceLastActivity: number | null
  daysInCurrentStage: number
  velocityVsAverage: number
  missingFields: string[]
  recommendedActions: RecommendedAction[]
  predictedCloseDate: string | null
  likelihoodToClose: number
  likelihoodToSlip: number
}

export interface RecommendedAction {
  type: 'contact' | 'update' | 'schedule' | 'escalate'
  priority: 'critical' | 'high' | 'medium'
  action: string
  reason: string
}

/**
 * Calculate risk score for a deal (0-100)
 * Higher score = Higher risk
 */
export function calculateDealRiskScore(
  opportunity: Opportunity,
  averageStageDuration: { [stage: string]: number } = {}
): RiskAnalysis {
  const factors: RiskFactors = {
    staleActivityScore: 0,
    velocityScore: 0,
    stageTimeScore: 0,
    missingDataScore: 0,
  }

  const missingFields: string[] = []
  const recommendedActions: RecommendedAction[] = []

  // Calculate days since last activity
  const updatedAt = opportunity.updated_at ? new Date(opportunity.updated_at) : new Date(opportunity.created_at!)
  const now = new Date()
  const daysSinceLastActivity = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  // 1. STALE ACTIVITY SCORE (0-40 points)
  // No activity = high risk
  if (daysSinceLastActivity > 30) {
    factors.staleActivityScore = 40
    recommendedActions.push({
      type: 'contact',
      priority: 'critical',
      action: `Contact ${opportunity.owner_name || 'deal owner'} immediately`,
      reason: `No activity in ${daysSinceLastActivity} days - high ghosting risk`
    })
  } else if (daysSinceLastActivity > 14) {
    factors.staleActivityScore = 30
    recommendedActions.push({
      type: 'contact',
      priority: 'high',
      action: `Follow up with ${opportunity.owner_name || 'deal owner'}`,
      reason: `${daysSinceLastActivity} days since last update`
    })
  } else if (daysSinceLastActivity > 7) {
    factors.staleActivityScore = 15
    recommendedActions.push({
      type: 'contact',
      priority: 'medium',
      action: 'Schedule check-in call',
      reason: `Deal hasn't been touched in ${daysSinceLastActivity} days`
    })
  }

  // 2. STAGE TIME SCORE (0-30 points)
  // Stuck in stage too long = risk
  const createdAt = new Date(opportunity.created_at!)
  const daysInCurrentStage = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  const expectedDuration = averageStageDuration[opportunity.stage || 'Unknown'] || 30
  const stageTimeRatio = daysInCurrentStage / expectedDuration

  if (stageTimeRatio > 2) {
    factors.stageTimeScore = 30
    recommendedActions.push({
      type: 'escalate',
      priority: 'critical',
      action: 'Escalate to management - deal stalled',
      reason: `${daysInCurrentStage} days in ${opportunity.stage} (avg: ${expectedDuration} days)`
    })
  } else if (stageTimeRatio > 1.5) {
    factors.stageTimeScore = 20
    recommendedActions.push({
      type: 'schedule',
      priority: 'high',
      action: 'Schedule decision maker meeting',
      reason: `Deal moving slower than average (${Math.round(stageTimeRatio * 100)}% of expected time)`
    })
  } else if (stageTimeRatio > 1.2) {
    factors.stageTimeScore = 10
  }

  // 3. VELOCITY SCORE (0-20 points)
  // This would normally compare to historical data
  // For now, use stage time as proxy
  const velocityVsAverage = 1 / (stageTimeRatio || 1)
  if (velocityVsAverage < 0.5) {
    factors.velocityScore = 20
  } else if (velocityVsAverage < 0.75) {
    factors.velocityScore = 10
  }

  // 4. MISSING DATA SCORE (0-10 points)
  // Critical fields missing = risk
  if (!opportunity.close_date) {
    missingFields.push('close_date')
    factors.missingDataScore += 3
    recommendedActions.push({
      type: 'update',
      priority: 'high',
      action: 'Add expected close date',
      reason: 'Close date missing - impacts forecast accuracy'
    })
  }
  
  if (!opportunity.amount || opportunity.amount === 0) {
    missingFields.push('amount')
    factors.missingDataScore += 3
  }
  
  if (!opportunity.stage) {
    missingFields.push('stage')
    factors.missingDataScore += 2
  }
  
  if (!opportunity.owner_name) {
    missingFields.push('owner')
    factors.missingDataScore += 2
  }

  // Calculate total risk score
  const riskScore = Math.min(
    100,
    factors.staleActivityScore +
    factors.stageTimeScore +
    factors.velocityScore +
    factors.missingDataScore
  )

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high'
  if (riskScore >= 61) {
    riskLevel = 'high'
  } else if (riskScore >= 31) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }

  // Calculate likelihood predictions
  const likelihoodToClose = Math.max(0, Math.min(100, 100 - riskScore + (opportunity.probability || 50)))
  const likelihoodToSlip = Math.min(100, riskScore * 0.8)

  // Predict close date (simple: current close date + delay based on risk)
  let predictedCloseDate = opportunity.close_date
  if (riskScore > 60 && opportunity.close_date) {
    const closeDate = new Date(opportunity.close_date)
    const delayDays = Math.floor(riskScore / 10) * 7 // 7 days delay per 10 risk points
    closeDate.setDate(closeDate.getDate() + delayDays)
    predictedCloseDate = closeDate.toISOString().split('T')[0]
  }

  // Sort actions by priority
  recommendedActions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return {
    riskScore,
    riskLevel,
    factors,
    daysSinceLastActivity,
    daysInCurrentStage,
    velocityVsAverage,
    missingFields,
    recommendedActions,
    predictedCloseDate,
    likelihoodToClose: Math.round(likelihoodToClose),
    likelihoodToSlip: Math.round(likelihoodToSlip),
  }
}

/**
 * Calculate average stage duration from historical data
 */
export function calculateAverageStageDurations(opportunities: Opportunity[]): { [stage: string]: number } {
  const stageDurations: { [stage: string]: number[] } = {}

  opportunities.forEach(opp => {
    if (!opp.stage) return
    
    const createdAt = new Date(opp.created_at!)
    const now = new Date()
    const duration = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    
    if (!stageDurations[opp.stage]) {
      stageDurations[opp.stage] = []
    }
    stageDurations[opp.stage].push(duration)
  })

  const averages: { [stage: string]: number } = {}
  Object.entries(stageDurations).forEach(([stage, durations]) => {
    averages[stage] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  })

  return averages
}

/**
 * Get risk insights for dashboard
 */
export function getRiskInsights(opportunities: Opportunity[]): string[] {
  const insights: string[] = []
  
  const highRiskCount = opportunities.filter(o => o.risk_score && o.risk_score >= 61).length
  const mediumRiskCount = opportunities.filter(o => o.risk_score && o.risk_score >= 31 && o.risk_score < 61).length
  
  if (highRiskCount > 0) {
    insights.push(`⚠️ ${highRiskCount} deal${highRiskCount > 1 ? 's' : ''} at high risk of slipping`)
  }
  
  if (mediumRiskCount > 3) {
    insights.push(`⚡ ${mediumRiskCount} deals need attention this week`)
  }
  
  const staleDeals = opportunities.filter(o => {
    const daysSince = o.days_since_update || 0
    return daysSince > 14
  })
  
  if (staleDeals.length > 0) {
    insights.push(`📞 ${staleDeals.length} deal${staleDeals.length > 1 ? 's have' : ' has'} no activity in 2+ weeks`)
  }
  
  return insights
}
