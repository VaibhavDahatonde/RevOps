import { BaseAgent, AgentAction } from './base-agent'
import type { Opportunity } from '../types/database'

/**
 * Forecast Agent
 * Automatically adjusts forecasts based on deal velocity and risk
 */
export class ForecastAgent extends BaseAgent {
  constructor(customerId: string) {
    super(customerId, 'forecast', false)
  }

  async analyze(): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    const opportunities = await this.getOpportunities()

    for (const opp of opportunities) {
      // Adjust close dates for deals past their expected close
      if (this.isOverdue(opp)) {
        const action = await this.adjustOverdueCloseDate(opp)
        if (action) actions.push(action)
      }

      // Adjust probability for high-risk deals
      if (opp.risk_score && opp.risk_score >= 70 && opp.probability && opp.probability > 50) {
        const action = await this.adjustProbability(opp)
        if (action) actions.push(action)
      }

      // Flag unlikely deals
      if (this.isUnlikelyToClose(opp)) {
        const action = await this.flagUnlikelyDeal(opp)
        if (action) actions.push(action)
      }
    }

    return actions
  }

  /**
   * Push close date for overdue deals
   */
  private async adjustOverdueCloseDate(opp: Opportunity): Promise<AgentAction | null> {
    const daysOverdue = this.getDaysOverdue(opp)
    
    // Calculate new realistic close date
    // Formula: today + (risk_score / 10) * 7 days
    const delayDays = Math.max(14, Math.floor((opp.risk_score || 50) / 10) * 7)
    const newCloseDate = new Date()
    newCloseDate.setDate(newCloseDate.getDate() + delayDays)

    return {
      type: 'adjust_forecast',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `Adjusted close date for "${opp.name}"`,
      fieldChanged: 'close_date',
      oldValue: opp.close_date || 'null',
      newValue: newCloseDate.toISOString().split('T')[0],
      reason: `Deal is ${daysOverdue} days overdue with risk score ${opp.risk_score}. Pushing close date to ${newCloseDate.toLocaleDateString()} for realistic forecast.`,
      confidence: 85,
      metadata: {
        daysOverdue,
        delayDays,
        riskScore: opp.risk_score,
        forecastImpact: -(opp.amount || 0),
      },
    }
  }

  /**
   * Reduce probability for high-risk deals
   */
  private async adjustProbability(opp: Opportunity): Promise<AgentAction | null> {
    // Reduce probability based on risk score
    const reduction = Math.floor((opp.risk_score! - 50) / 5) * 5 // 5% per 5 risk points above 50
    const newProbability = Math.max(10, opp.probability! - reduction)

    if (newProbability >= opp.probability!) {
      return null // Don't increase probability
    }

    return {
      type: 'update_field',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `Adjusted probability for "${opp.name}"`,
      fieldChanged: 'probability',
      oldValue: String(opp.probability),
      newValue: String(newProbability),
      reason: `High risk score (${opp.risk_score}) indicates lower likelihood to close. Reduced from ${opp.probability}% to ${newProbability}%.`,
      confidence: 75,
      metadata: {
        riskScore: opp.risk_score,
        probabilityReduction: reduction,
      },
    }
  }

  /**
   * Alert on deals unlikely to close
   */
  private async flagUnlikelyDeal(opp: Opportunity): Promise<AgentAction | null> {
    return {
      type: 'send_alert',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `❌ Low Win Probability: "${opp.name}"`,
      reason: `Deal shows multiple red flags: Risk score ${opp.risk_score}, ${opp.days_since_update} days without activity. Consider disqualifying.`,
      confidence: 82,
      metadata: {
        severity: 'medium',
        recommendedAction: 'Evaluate if this deal should remain in active pipeline or be moved to nurture',
        riskScore: opp.risk_score,
        dealAmount: opp.amount,
      },
    }
  }

  /**
   * Check if deal is past close date
   */
  private isOverdue(opp: Opportunity): boolean {
    if (!opp.close_date) return false
    return new Date(opp.close_date) < new Date()
  }

  /**
   * Calculate days overdue
   */
  private getDaysOverdue(opp: Opportunity): number {
    if (!opp.close_date) return 0
    const closeDate = new Date(opp.close_date)
    const now = new Date()
    return Math.floor((now.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Determine if deal is unlikely to close
   */
  private isUnlikelyToClose(opp: Opportunity): boolean {
    return (
      (opp.risk_score || 0) >= 80 &&
      (opp.days_since_update || 0) > 30 &&
      (opp.probability || 100) > 50
    )
  }
}
