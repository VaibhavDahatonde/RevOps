import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSalesforceAuthUrl, generateCodeVerifier, generateCodeChallenge } from '@/lib/integrations/salesforce'

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

    if (!process.env.SALESFORCE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Salesforce client ID not configured' },
        { status: 500 }
      )
    }

    const redirectUri =
      process.env.SALESFORCE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/salesforce`

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    const authUrl = getSalesforceAuthUrl(redirectUri, codeChallenge)

    // Return auth URL and set code_verifier in a secure cookie
    const response = NextResponse.json({ authUrl })
    response.cookies.set('sf_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Salesforce connect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

