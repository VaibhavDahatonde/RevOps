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

    if (!process.env.GONG_CLIENT_ID) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('Gong client ID not configured - using development mock mode')
        return NextResponse.json({ 
          authUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gong?code=mock_gong_code&state=${customer.id}` 
        })
      }
      
      return NextResponse.json(
        { error: 'Gong client ID not configured' },
        { status: 500 }
      )
    }

    const redirectUri =
      process.env.GONG_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gong`

    const authUrl = new URL('https://app.gong.io/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.GONG_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'calls:read transcripts:read users:read webhooks:write')
    authUrl.searchParams.set('state', customer.id)

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error: any) {
    console.error('Gong connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Gong connection' },
      { status: 500 }
    )
  }
}
