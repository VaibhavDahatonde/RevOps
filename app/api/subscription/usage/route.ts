// GET /api/subscription/usage - Get usage data with limits

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsageStatus } from '@/lib/subscription/limits'
import { PLAN_CONFIG } from '@/lib/subscription/plans'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_tier, current_period_end')
      .eq('customer_id', customer.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get usage status
    const usageStatus = await getUsageStatus(customer.id)

    // Get plan details
    const planConfig = PLAN_CONFIG[subscription.plan_tier as keyof typeof PLAN_CONFIG]

    return NextResponse.json({
      planTier: subscription.plan_tier,
      planName: planConfig.name,
      periodEnd: subscription.current_period_end,
      usage: usageStatus
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}
