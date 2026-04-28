import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getHubSpotAuthUrl } from '@/lib/integrations/hubspot'

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

    if (!process.env.HUBSPOT_CLIENT_ID) {
      return NextResponse.json(
        { error: 'HubSpot client ID not configured' },
        { status: 500 }
      )
    }

    const redirectUri =
      process.env.HUBSPOT_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/hubspot`

    const authUrl = getHubSpotAuthUrl(redirectUri)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('HubSpot connect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

