import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeGongCode } from '@/lib/integrations/gong'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // customerId

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    let accessToken = 'mock_gong_access_token'
    let refreshToken = 'mock_gong_refresh_token'

    // Only exchange code if not in mock mode
    if (code !== 'mock_gong_code') {
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gong`
      const tokens = await exchangeGongCode(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
    }

    // Update customer with Gong tokens
    const { error } = await supabase
      .from('customers')
      .update({
        gong_connected: true,
        gong_token: accessToken,
        gong_refresh_token: refreshToken,
        gong_last_sync: new Date().toISOString(),
      })
      .eq('id', state)

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
    }

    // Redirect back to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings`)
  } catch (error: any) {
    console.error('Gong callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=gong_connection_failed`)
  }
}
