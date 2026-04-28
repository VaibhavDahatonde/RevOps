// Usage limit checking and enforcement

import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, isPlanUnlimited, type PlanTier } from './plans'

export type UsageMetric = 'records' | 'aiActions' | 'users' | 'crmConnections' | 'agentRuns'

export interface UsageData {
  records: number
  aiActions: number
  users: number
  crmConnections: number
  agentRuns: number
}

export interface UsageStatus {
  metric: UsageMetric
  current: number
  limit: number
  percentage: number
  exceeded: boolean
  unlimited: boolean
}

/**
 * Check if customer has exceeded a usage limit
 */
export async function checkUsageLimit(
  customerId: string,
  metric: UsageMetric
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = await createClient()

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('customer_id', customerId)
    .single()

  if (!subscription) {
    return { allowed: false, current: 0, limit: 0 }
  }

  const planTier = subscription.plan_tier as PlanTier
  const limits = getPlanLimits(planTier)
  const limit = limits[metric]

  // If unlimited, always allow
  if (isPlanUnlimited(planTier, metric)) {
    return { allowed: true, current: 0, limit }
  }

  // Get current usage
  const { data: usage } = await supabase
    .from('usage_metrics')
    .select(`${metric}_count`)
    .eq('customer_id', customerId)
    .lte('period_start', new Date().toISOString())
    .gte('period_end', new Date().toISOString())
    .single()

  const current = (usage as any)?.[`${metric}_count`] || 0
  const allowed = current < limit

  return { allowed, current, limit }
}

/**
 * Increment usage counter for a metric
 */
export async function incrementUsage(
  customerId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<void> {
  const supabase = await createClient()

  // Call the database function
  await supabase.rpc('increment_usage', {
    p_customer_id: customerId,
    p_metric: metric,
    p_amount: amount
  })
}

/**
 * Get all usage data for a customer
 */
export async function getUsageData(customerId: string): Promise<UsageData | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('customer_id', customerId)
    .lte('period_start', new Date().toISOString())
    .gte('period_end', new Date().toISOString())
    .single()

  if (!data) return null

  return {
    records: data.records_count || 0,
    aiActions: data.ai_actions_count || 0,
    users: data.users_count || 0,
    crmConnections: data.crm_connections_count || 0,
    agentRuns: data.agent_runs_count || 0
  }
}

/**
 * Get usage status for all metrics
 */
export async function getUsageStatus(customerId: string): Promise<UsageStatus[]> {
  const supabase = await createClient()

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('customer_id', customerId)
    .single()

  if (!subscription) return []

  const planTier = subscription.plan_tier as PlanTier
  const limits = getPlanLimits(planTier)
  const usage = await getUsageData(customerId)

  if (!usage) return []

  const metrics: UsageMetric[] = ['records', 'aiActions', 'users', 'crmConnections', 'agentRuns']
  
  return metrics.map(metric => {
    const current = usage[metric]
    const limit = limits[metric]
    const unlimited = isPlanUnlimited(planTier, metric)
    const percentage = unlimited ? 0 : Math.min((current / limit) * 100, 100)
    const exceeded = !unlimited && current >= limit

    return {
      metric,
      current,
      limit,
      percentage,
      exceeded,
      unlimited
    }
  })
}

/**
 * Update CRM connection count
 */
export async function updateCrmConnectionCount(customerId: string): Promise<void> {
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('salesforce_connected, hubspot_connected')
    .eq('id', customerId)
    .single()

  if (!customer) return

  const count = 
    (customer.salesforce_connected ? 1 : 0) + 
    (customer.hubspot_connected ? 1 : 0)

  const now = new Date().toISOString()
  
  await supabase
    .from('usage_metrics')
    .update({ 
      crm_connections_count: count,
      updated_at: now
    })
    .eq('customer_id', customerId)
    .lte('period_start', now)
    .gte('period_end', now)
}
