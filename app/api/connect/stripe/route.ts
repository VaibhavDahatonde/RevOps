import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer record
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // If customer doesn't exist, create it
    if (!customer) {
      const { data: newCustomer, error: createError } = await serviceSupabase
        .from('customers')
        .insert({
          user_id: user.id,
          email: user.email || '',
          subscription_tier: 'free',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Create customer error:', createError)
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        )
      }

      customer = newCustomer
    }

    const redirectUri =
      process.env.STRIPE_PUBLISHABLE_KEY ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/stripe`

    // Build Stripe Connect URL (account selection)
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.STRIPE_PUBLISHABLE_KEY!)
    authUrl.searchParams.set('scope', 'read_write')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', customer.id)
    authUrl.searchParams.set('stripe_landing', 'dashboard')

    // Add capability selection UI
    return NextResponse.json({ 
      authUrl: authUrl.toString(),
      capabilities: [
        {
          id: 'billing',
          name: 'Billing Automation',
          description: 'Auto-invoice generation and revenue tracking',
          features: ['webhooks', 'invoices', 'subscriptions', 'customers']
        },
        {
          id: 'revenue',
          name: 'Revenue Intelligence', 
          description: 'Revenue forecasting and churn analysis',
          features: ['metrics', 'analytics', 'forecasts']
        }
      ]
    })
  } catch (error: any) {
    console.error('Stripe connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Stripe connection' },
      { status: 500 }
    )
  }
}
