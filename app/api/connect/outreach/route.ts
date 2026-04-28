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

    if (!process.env.OUTREACH_CLIENT_ID) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('Outreach client ID not configured - using development mock mode')
        return NextResponse.json({ 
          authUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/outreach?code=mock_outreach_code&state=${customer.id}` 
        })
      }

      return NextResponse.json(
        { error: 'Outreach client ID not configured' },
        { status: 500 }
      )
    }

    const redirectUri =
      process.env.OUTREACH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/outreach`

    // Outreach OAuth URL
    const authUrl = new URL('https://api.outreach.io/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.OUTREACH_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'sequence.prospects.write sequence.prospects.read prospects.read prospects.write mailboxes.read mailboxes.write templates.read templates.write')
    authUrl.searchParams.set('state', customer.id)

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error: any) {
    console.error('Outreach connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Outreach connection' },
      { status: 500 }
    )
  }
}
