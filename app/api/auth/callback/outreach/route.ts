import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeOutreachCode } from '@/lib/integrations/outreach'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // customerId

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    let accessToken = 'mock_outreach_access_token'
    let refreshToken = 'mock_outreach_refresh_token'

    // Only exchange code if not in mock mode
    if (code !== 'mock_outreach_code') {
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/outreach`
      const tokens = await exchangeOutreachCode(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
    }

    // Update customer with Outreach tokens
    const { error } = await supabase
      .from('customers')
      .update({
        outreach_connected: true,
        outreach_token: accessToken,
        outreach_refresh_token: refreshToken,
        outreach_last_sync: new Date().toISOString(),
      })
      .eq('id', state)

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
    }

    // Redirect back to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings`)
  } catch (error: any) {
    console.error('Outreach callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=outreach_connection_failed`)
  }
}
