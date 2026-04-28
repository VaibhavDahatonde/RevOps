import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeSalesloftCode } from '@/lib/integrations/salesloft'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // customerId

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    let accessToken = 'mock_salesloft_access_token'
    let refreshToken = 'mock_salesloft_refresh_token'

    // Only exchange code if not in mock mode
    if (code !== 'mock_salesloft_code') {
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/salesloft`
      const tokens = await exchangeSalesloftCode(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
    }

    // Update customer with Salesloft tokens
    const { error } = await supabase
      .from('customers')
      .update({
        salesloft_connected: true,
        salesloft_token: accessToken,
        salesloft_refresh_token: refreshToken,
        salesloft_last_sync: new Date().toISOString(),
      })
      .eq('id', state)

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
    }

    // Redirect back to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings`)
  } catch (error: any) {
    console.error('Salesloft callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=salesloft_connection_failed`)
  }
}
