export { BaseAgent } from './base-agent'
export { DataHygieneAgent } from './data-hygiene-agent'
export { DealRiskAgent } from './deal-risk-agent'
export { ForecastAgent } from './forecast-agent'

import { DataHygieneAgent } from './data-hygiene-agent'
import { DealRiskAgent } from './deal-risk-agent'
import { ForecastAgent } from './forecast-agent'
import type { AgentResult } from './base-agent'

/**
 * Run all agents for a customer
 */
export async function runAllAgents(customerId: string): Promise<{
  success: boolean
  results: { [key: string]: AgentResult }
  totalActions: number
  error?: string
}> {
  const results: { [key: string]: AgentResult } = {}
  let totalActions = 0

  try {
    // Run agents in sequence
    const dataHygiene = new DataHygieneAgent(customerId)
    results.dataHygiene = await dataHygiene.run()
    totalActions += results.dataHygiene.actionsExecuted

    const dealRisk = new DealRiskAgent(customerId)
    results.dealRisk = await dealRisk.run()
    totalActions += results.dealRisk.actionsExecuted

    const forecast = new ForecastAgent(customerId)
    results.forecast = await forecast.run()
    totalActions += results.forecast.actionsExecuted

    return {
      success: true,
      results,
      totalActions,
    }
  } catch (error: any) {
    return {
      success: false,
      results,
      totalActions,
      error: error.message,
    }
  }
}

/**
 * Run a specific agent
 */
export async function runAgent(
  customerId: string,
  agentType: 'data_hygiene' | 'deal_risk' | 'forecast'
): Promise<AgentResult> {
  switch (agentType) {
    case 'data_hygiene':
      return await new DataHygieneAgent(customerId).run()
    case 'deal_risk':
      return await new DealRiskAgent(customerId).run()
    case 'forecast':
      return await new ForecastAgent(customerId).run()
    default:
      throw new Error(`Unknown agent type: ${agentType}`)
  }
}
