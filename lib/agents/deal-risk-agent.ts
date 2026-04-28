import { BaseAgent, AgentAction } from './base-agent'
import type { Opportunity } from '../types/database'

/**
 * Deal Risk Agent
 * Proactively identifies at-risk deals and takes preventive action
 */
export class DealRiskAgent extends BaseAgent {
  constructor(customerId: string) {
    super(customerId, 'deal_risk', false)
  }

  async analyze(): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    const opportunities = await this.getOpportunities()

    // Focus on high-risk deals
    const highRiskDeals = opportunities.filter(
      opp => opp.risk_score && opp.risk_score >= 60
    )

    for (const opp of highRiskDeals) {
      // Handle stale deals (no activity)
      if (opp.days_since_update && opp.days_since_update > 14) {
        const action = await this.handleStaleDeal(opp)
        if (action) actions.push(action)
      }

      // Handle deals stuck in stage
      const daysInStage = this.calculateDaysInStage(opp)
      if (daysInStage > 45) {
        const action = await this.handleStuckDeal(opp, daysInStage)
        if (action) actions.push(action)
      }

      // Handle deals approaching close date with low activity
      const daysToClose = this.calculateDaysToClose(opp)
      if (daysToClose > 0 && daysToClose < 7 && opp.days_since_update && opp.days_since_update > 3) {
        const action = await this.handleLastMinuteDeal(opp, daysToClose)
        if (action) actions.push(action)
      }

      // Handle deals past close date still open
      if (daysToClose < 0) {
        const action = await this.handleOverdueDeal(opp, Math.abs(daysToClose))
        if (action) actions.push(action)
      }
    }

    return actions
  }

  /**
   * Alert on deals with no recent activity
   */
  private async handleStaleDeal(opp: Opportunity): Promise<AgentAction | null> {
    const severity = opp.days_since_update! > 30 ? 'critical' : 'high'
    
    return {
      type: 'send_alert',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `🚨 Stale Deal Alert: "${opp.name}"`,
      reason: `No activity in ${opp.days_since_update} days. Deal value: $${(opp.amount || 0).toLocaleString()}. Risk of ghosting.`,
      confidence: 90,
      metadata: {
        severity,
        recommendedAction: `Contact ${opp.owner_name || 'deal owner'} immediately to re-engage`,
        dealAmount: opp.amount,
        daysSinceUpdate: opp.days_since_update,
      },
    }
  }

  /**
   * Alert on deals stuck in same stage too long
   */
  private async handleStuckDeal(opp: Opportunity, daysInStage: number): Promise<AgentAction | null> {
    return {
      type: 'send_alert',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `⚠️ Deal Stuck in "${opp.stage}": "${opp.name}"`,
      reason: `Deal has been in ${opp.stage} stage for ${daysInStage} days. Average stage time is ~30 days.`,
      confidence: 85,
      metadata: {
        severity: 'high',
        recommendedAction: 'Schedule decision-maker meeting or re-qualify this opportunity',
        daysInStage,
        stage: opp.stage,
      },
    }
  }

  /**
   * Alert on deals closing soon with low engagement
   */
  private async handleLastMinuteDeal(opp: Opportunity, daysToClose: number): Promise<AgentAction | null> {
    return {
      type: 'send_alert',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `⏰ Deal Closing Soon: "${opp.name}"`,
      reason: `Deal closes in ${daysToClose} days but no activity in ${opp.days_since_update} days. High slip risk.`,
      confidence: 88,
      metadata: {
        severity: 'critical',
        recommendedAction: 'Touch base today - deal may need to be pushed or closed urgently',
        daysToClose,
        daysSinceUpdate: opp.days_since_update,
      },
    }
  }

  /**
   * Handle deals past their close date
   */
  private async handleOverdueDeal(opp: Opportunity, daysOverdue: number): Promise<AgentAction | null> {
    // Recommend pushing close date
    const newCloseDate = new Date()
    newCloseDate.setDate(newCloseDate.getDate() + 30) // Push 30 days

    return {
      type: 'create_task',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `📅 Update Close Date for "${opp.name}"`,
      reason: `Deal is ${daysOverdue} days past expected close date. Needs forecast adjustment.`,
      confidence: 95,
      metadata: {
        severity: 'high',
        taskDescription: `Update close date to ${newCloseDate.toISOString().split('T')[0]} or close/disqualify this deal`,
        currentCloseDate: opp.close_date,
        suggestedCloseDate: newCloseDate.toISOString().split('T')[0],
        daysOverdue,
      },
    }
  }

  /**
   * Calculate days since deal created (proxy for days in stage)
   */
  private calculateDaysInStage(opp: Opportunity): number {
    const created = new Date(opp.created_at!)
    const now = new Date()
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Calculate days until close date
   */
  private calculateDaysToClose(opp: Opportunity): number {
    if (!opp.close_date) return 999 // Far future if no date
    const closeDate = new Date(opp.close_date)
    const now = new Date()
    return Math.floor((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }
}
