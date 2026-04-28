import { BaseAgent, AgentAction } from './base-agent'
import type { Opportunity } from '../types/database'

/**
 * Data Hygiene Agent - AI-Powered
 * Automatically fills missing CRM fields using AI reasoning and historical data
 */
export class DataHygieneAgent extends BaseAgent {
  private cachedMedianAmount: number | null = null
  private cachedHistoricalData: any = null

  constructor(customerId: string) {
    super(customerId, 'data_hygiene', false) // No approval needed for data fixes
  }

  async analyze(): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    const opportunities = await this.getOpportunities()

    // Cache historical data for context (avoid repeated calls)
    await this.loadHistoricalContext(opportunities)

    // Prioritize by impact: missing amounts > close dates > stage > probability
    const prioritized = this.prioritizeOpportunities(opportunities)

    for (const opp of prioritized) {
      // Fix missing close dates
      if (!opp.close_date) {
        const action = await this.fixMissingCloseDate(opp)
        if (action) actions.push(action)
      }

      // Fix missing amounts
      if (!opp.amount || opp.amount === 0) {
        const action = await this.fixMissingAmount(opp)
        if (action) actions.push(action)
      }

      // Fix missing stage
      if (!opp.stage) {
        const action = await this.fixMissingStage(opp)
        if (action) actions.push(action)
      }

      // Fix missing probability
      if (opp.probability === null || opp.probability === undefined) {
        const action = await this.fixMissingProbability(opp)
        if (action) actions.push(action)
      }

      // Limit to 20 actions per run to avoid rate limits
      if (actions.length >= 20) break
    }

    return actions
  }

  /**
   * Load historical data for better AI predictions
   */
  private async loadHistoricalContext(opportunities: Opportunity[]) {
    const amounts = opportunities
      .filter(o => o.amount && o.amount > 0)
      .map(o => o.amount!)

    if (amounts.length > 0) {
      amounts.sort((a, b) => a - b)
      this.cachedMedianAmount = amounts[Math.floor(amounts.length / 2)]
    }

    this.cachedHistoricalData = {
      totalDeals: opportunities.length,
      avgAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
      medianAmount: this.cachedMedianAmount,
      stages: [...new Set(opportunities.map(o => o.stage).filter(Boolean))],
      avgCycleTime: 45, // Could calculate from closed_deals
    }
  }

  /**
   * Prioritize opportunities by business impact
   */
  private prioritizeOpportunities(opportunities: Opportunity[]): Opportunity[] {
    return opportunities.sort((a, b) => {
      // Priority: larger amounts first, then newer deals
      const amountDiff = (b.amount || 0) - (a.amount || 0)
      if (Math.abs(amountDiff) > 1000) return amountDiff > 0 ? 1 : -1
      
      const aDate = new Date(a.created_at || 0).getTime()
      const bDate = new Date(b.created_at || 0).getTime()
      return bDate - aDate
    })
  }

  /**
   * AI-powered: Predict and fill missing close date
   */
  private async fixMissingCloseDate(opp: Opportunity): Promise<AgentAction | null> {
    try {
      const context = this.cachedHistoricalData
      const createdDate = new Date(opp.created_at!)
      const now = new Date()
      const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      // AI predicts close date with rich context
      const prompt = `You are a B2B sales forecasting AI. Predict a realistic close date for this deal.

Deal Details:
- Name: ${opp.name}
- Amount: $${(opp.amount || 0).toLocaleString()}
- Stage: ${opp.stage || 'Unknown'}
- Created: ${opp.created_at} (${daysOld} days ago)
- Account: ${opp.account_name || 'Unknown'}
- Owner: ${opp.owner_name || 'Unassigned'}

Historical Context:
- Average deal cycle: ${context.avgCycleTime} days
- Median deal size: $${(context.medianAmount || 0).toLocaleString()}
- Active stages: ${context.stages.join(', ')}

Instructions:
1. Consider the deal stage and typical progression time
2. Account for how long it's been in pipeline already
3. Add buffer time for realistic completion
4. If deal is stale (60+ days old), add extra time
5. Return ONLY the date in YYYY-MM-DD format, nothing else

Predicted Close Date:`

      const response = await this.askAI(prompt)
      const cleanedDate = response.trim().match(/\d{4}-\d{2}-\d{2}/)?.[0]

      if (!cleanedDate) {
        // Fallback: Use rule-based calculation
        const fallbackDate = new Date()
        fallbackDate.setDate(fallbackDate.getDate() + Math.max(30, context.avgCycleTime - daysOld))
        return this.createCloseDateAction(opp, fallbackDate.toISOString().split('T')[0], 60, 'fallback_calculation')
      }

      // Validate date is reasonable (not in past, not too far future)
      const predicted = new Date(cleanedDate)
      const today = new Date()
      
      if (predicted < today) {
        predicted.setDate(today.getDate() + 14) // 2 weeks minimum
      }
      
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 180) // 6 months max
      if (predicted > maxDate) {
        predicted.setTime(maxDate.getTime())
      }

      return this.createCloseDateAction(opp, predicted.toISOString().split('T')[0], 80, 'ai_prediction')
    } catch (error) {
      console.error('Failed to predict close date:', error)
      
      // Fallback to simple calculation
      const fallbackDate = new Date()
      fallbackDate.setDate(fallbackDate.getDate() + 45)
      return this.createCloseDateAction(opp, fallbackDate.toISOString().split('T')[0], 50, 'error_fallback')
    }
  }

  private createCloseDateAction(opp: Opportunity, date: string, confidence: number, source: string): AgentAction {
    return {
      type: 'update_field',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `Auto-filled missing close date for "${opp.name}"`,
      fieldChanged: 'close_date',
      oldValue: undefined,
      newValue: date,
      reason: `Close date was missing, predicted using AI analysis of deal characteristics and historical patterns`,
      confidence,
      metadata: { source, predictedDate: date },
    }
  }

  /**
   * AI-powered: Estimate missing deal amount
   */
  private async fixMissingAmount(opp: Opportunity): Promise<AgentAction | null> {
    try {
      const context = this.cachedHistoricalData

      // Use AI for larger, more important deals
      if (opp.stage && opp.stage !== 'Prospecting' && opp.account_name) {
        const prompt = `You are a B2B sales analyst. Estimate a realistic deal amount.

Deal Information:
- Name: ${opp.name}
- Stage: ${opp.stage}
- Account: ${opp.account_name}
- Owner: ${opp.owner_name || 'Unknown'}
- Created: ${opp.created_at}

Historical Context:
- Average deal size: $${(context.avgAmount || 0).toLocaleString()}
- Median deal size: $${(context.medianAmount || 0).toLocaleString()}
- Total deals analyzed: ${context.totalDeals}

Instructions:
1. Consider the deal stage (later stages usually = larger deals)
2. Account for company/account context if available
3. Use historical averages as baseline
4. Return ONLY a number (no $ or commas), nothing else

Estimated Amount (USD):`

        try {
          const response = await this.askAI(prompt)
          const amount = parseFloat(response.trim().replace(/[^0-9.]/g, ''))
          
          if (!isNaN(amount) && amount > 0 && amount < 10000000) {
            return {
              type: 'update_field',
              targetType: 'opportunity',
              targetId: opp.id,
              description: `AI estimated amount for "${opp.name}"`,
              fieldChanged: 'amount',
              oldValue: String(opp.amount || 0),
              newValue: String(Math.round(amount)),
              reason: `Amount was missing, estimated using AI analysis of deal stage, account, and historical comparables`,
              confidence: 75,
              metadata: { source: 'ai_estimation', originalEstimate: amount },
            }
          }
        } catch (aiError) {
          console.log('AI estimation failed, using fallback')
        }
      }

      // Fallback: Use historical median
      if (context.medianAmount && context.medianAmount > 0) {
        return {
          type: 'update_field',
          targetType: 'opportunity',
          targetId: opp.id,
          description: `Estimated amount for "${opp.name}"`,
          fieldChanged: 'amount',
          oldValue: String(opp.amount || 0),
          newValue: String(context.medianAmount),
          reason: `Amount was missing, estimated based on median of similar deals ($${context.medianAmount.toLocaleString()})`,
          confidence: 65,
          metadata: { source: 'historical_median', needs_verification: true },
        }
      }

      // Last resort: Industry default
      const defaultAmount = 50000
      return {
        type: 'update_field',
        targetType: 'opportunity',
        targetId: opp.id,
        description: `Set default amount for "${opp.name}"`,
        fieldChanged: 'amount',
        oldValue: String(opp.amount || 0),
        newValue: String(defaultAmount),
        reason: 'Amount was missing, used industry average baseline',
        confidence: 50,
        metadata: { source: 'industry_default', needs_verification: true },
      }
    } catch (error) {
      console.error('Failed to estimate amount:', error)
      return null
    }
  }

  /**
   * AI-powered: Infer missing stage
   */
  private async fixMissingStage(opp: Opportunity): Promise<AgentAction | null> {
    try {
      const context = this.cachedHistoricalData
      const daysOld = Math.floor((new Date().getTime() - new Date(opp.created_at!).getTime()) / (1000 * 60 * 60 * 24))

      const prompt = `You are a sales operations AI. Determine the correct pipeline stage for this deal.

Deal Information:
- Name: ${opp.name}
- Amount: $${(opp.amount || 0).toLocaleString()}
- Created: ${daysOld} days ago
- Close Date: ${opp.close_date || 'Not set'}
- Owner: ${opp.owner_name || 'Unassigned'}

Available Stages:
${context.stages.length > 0 ? context.stages.join(', ') : 'Prospecting, Qualification, Proposal, Negotiation, Closed Won'}

Instructions:
1. Newer deals (< 7 days) are usually in early stages
2. Deals with close dates soon are likely in later stages
3. Use common B2B sales pipeline logic
4. Return ONLY the stage name, nothing else

Pipeline Stage:`

      const response = await this.askAI(prompt)
      const stage = response.trim().split('\n')[0].trim()
      
      // Validate stage is reasonable
      if (stage && stage.length > 0 && stage.length < 50) {
        return {
          type: 'update_field',
          targetType: 'opportunity',
          targetId: opp.id,
          description: `AI determined stage for "${opp.name}"`,
          fieldChanged: 'stage',
          oldValue: undefined,
          newValue: stage,
          reason: `Stage was missing, determined using AI analysis of deal characteristics`,
          confidence: 75,
          metadata: { source: 'ai_inference' },
        }
      }
    } catch (error) {
      console.log('AI stage inference failed, using default')
    }

    // Fallback: Default to 'Qualification' for new deals
    return {
      type: 'update_field',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `Set default stage for "${opp.name}"`,
      fieldChanged: 'stage',
      oldValue: undefined,
      newValue: 'Qualification',
      reason: 'Stage was missing, defaulted to Qualification',
      confidence: 65,
      metadata: { source: 'default_value' },
    }
  }

  /**
   * AI-powered: Calculate missing probability
   */
  private async fixMissingProbability(opp: Opportunity): Promise<AgentAction | null> {
    try {
      if (!opp.stage) {
        // Can't determine probability without stage
        return null
      }

      const context = this.cachedHistoricalData
      const daysOld = Math.floor((new Date().getTime() - new Date(opp.created_at!).getTime()) / (1000 * 60 * 60 * 24))
      const daysToClose = opp.close_date 
        ? Math.floor((new Date(opp.close_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null

      const prompt = `You are a sales forecasting AI. Estimate the win probability for this deal.

Deal Information:
- Name: ${opp.name}
- Stage: ${opp.stage}
- Amount: $${(opp.amount || 0).toLocaleString()}
- Days in pipeline: ${daysOld}
${daysToClose !== null ? `- Days until close date: ${daysToClose}` : ''}
- Risk score: ${opp.risk_score || 'Unknown'}

Context:
- Typical stage progression suggests certain probabilities
- Deals closer to close date with low activity = lower probability
- Later stages = higher probability
- Average cycle time: ${context.avgCycleTime} days

Instructions:
1. Consider the stage (later = higher %)
2. Account for deal age and close date proximity
3. Factor in risk score if available
4. Return ONLY a number between 0-100, nothing else

Win Probability %:`

      const response = await this.askAI(prompt)
      const probability = parseInt(response.trim().replace(/[^0-9]/g, ''))
      
      if (!isNaN(probability) && probability >= 0 && probability <= 100) {
        return {
          type: 'update_field',
          targetType: 'opportunity',
          targetId: opp.id,
          description: `AI calculated probability for "${opp.name}"`,
          fieldChanged: 'probability',
          oldValue: undefined,
          newValue: String(probability),
          reason: `Probability was missing, calculated using AI analysis of stage, timing, and risk factors`,
          confidence: 80,
          metadata: { source: 'ai_calculation' },
        }
      }
    } catch (error) {
      console.log('AI probability calculation failed, using fallback')
    }

    // Fallback: Map stage to typical probability
    const stageProbabilities: { [key: string]: number } = {
      'Prospecting': 10,
      'Qualification': 20,
      'Needs Analysis': 30,
      'Proposal': 50,
      'Negotiation': 70,
      'Closed Won': 100,
      'Closed Lost': 0,
    }

    const probability = stageProbabilities[opp.stage || ''] || 50

    return {
      type: 'update_field',
      targetType: 'opportunity',
      targetId: opp.id,
      description: `Set probability for "${opp.name}"`,
      fieldChanged: 'probability',
      oldValue: undefined,
      newValue: String(probability),
      reason: `Probability was missing, set to ${probability}% based on stage "${opp.stage}"`,
      confidence: 75,
      metadata: { source: 'stage_mapping' },
    }
  }
}
