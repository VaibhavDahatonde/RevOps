// POST /api/subscription/upgrade - Upgrade/change plan

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLAN_CONFIG, type PlanTier } from '@/lib/subscription/plans'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planTier, billingCycle } = body

    if (!planTier || !['free', 'starter', 'professional', 'enterprise'].includes(planTier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 })
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

    // Get current subscription
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_id', customer.id)
      .single()

    if (!currentSub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // For paid plans, redirect to checkout
    const planConfig = PLAN_CONFIG[planTier as PlanTier]
    
    if (planConfig.price.monthly && planConfig.price.monthly > 0) {
      // Store selected plan
      await supabase
        .from('customers')
        .update({ selected_plan: planTier })
        .eq('id', customer.id)

      return NextResponse.json({
        requiresPayment: true,
        planTier,
        billingCycle: billingCycle || 'monthly'
      })
    }

    // For free plan, update immediately
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_tier: planTier,
        billing_cycle: billingCycle || 'monthly',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customer.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${currentSub.plan_tier === 'free' ? 'upgraded' : 'changed'} to ${planConfig.name} plan`
    })
  } catch (error) {
    console.error('Error upgrading subscription:', error)
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    )
  }
}
