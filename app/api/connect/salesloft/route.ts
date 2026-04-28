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

    if (!process.env.SALESLOFT_CLIENT_ID) {
      // Development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('Salesloft client ID not configured - using development mock mode')
        return NextResponse.json({ 
          authUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/salesloft?code=mock_salesloft_code&state=${customer.id}` 
        })
      }

      return NextResponse.json(
        { error: 'Salesloft client ID not configured' },
        { status: 500 }
      )
    }

    const redirectUri =
      process.env.SALESLOFT_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/salesloft`

    // Salesloft OAuth URL
    const authUrl = new URL('https://app.salesloft.com/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.SALESLOFT_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'cadences.read cadences.write people.read people.write calls.read calls.read emails.read emails.write')
    authUrl.searchParams.set('state', customer.id)

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error: any) {
    console.error('Salesloft connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Salesloft connection' },
      { status: 500 }
    )
  }
}
