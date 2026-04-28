// POST /api/subscription/migrate - Create subscription for existing users

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer
    const { data: customer, error: customerError } = await serviceSupabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if subscription already exists
    const { data: existingSub } = await serviceSupabase
      .from('subscriptions')
      .select('id')
      .eq('customer_id', customer.id)
      .single()

    if (existingSub) {
      return NextResponse.json({ 
        message: 'Subscription already exists',
        subscriptionId: existingSub.id
      })
    }

    // Create subscription
    const now = new Date()
    const planTier = customer.selected_plan || customer.subscription_tier || 'free'
    const isTrialing = ['starter', 'professional'].includes(planTier)

    const { data: subscription, error: subError } = await serviceSupabase
      .from('subscriptions')
      .insert({
        customer_id: customer.id,
        plan_tier: planTier,
        status: isTrialing ? 'trialing' : 'active',
        trial_started_at: isTrialing ? now.toISOString() : null,
        trial_ends_at: isTrialing 
          ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        current_period_start: now.toISOString(),
        current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (subError) {
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    // Create usage metrics
    const { data: usage, error: usageError } = await serviceSupabase
      .from('usage_metrics')
      .insert({
        customer_id: customer.id,
        period_start: now.toISOString(),
        period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        users_count: 1,
        records_count: 0,
        ai_actions_count: 0,
        crm_connections_count: (customer.salesforce_connected ? 1 : 0) + (customer.hubspot_connected ? 1 : 0),
        agent_runs_count: 0
      })
      .select()
      .single()

    if (usageError) {
      // Don't fail the whole migration if usage creation fails
      console.error('Error creating usage metrics:', usageError)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      subscription,
      usage
    })
  } catch (error: any) {
    console.error('Error migrating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to migrate subscription' },
      { status: 500 }
    )
  }
}
