import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeHubSpotCode } from '@/lib/integrations/hubspot'
import { SyncEngine } from '@/lib/sync-engine'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL('/onboarding?error=hubspot_auth_failed', request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/onboarding?error=no_code', request.url)
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/onboarding?error=unauthorized', request.url))
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.redirect(new URL('/onboarding?error=no_customer', request.url))
    }

    const redirectUri =
      process.env.HUBSPOT_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/hubspot`

    // Exchange code for tokens
    const tokens = await exchangeHubSpotCode(code, redirectUri)

    // Update customer record
    await supabase
      .from('customers')
      .update({
        hubspot_connected: true,
        hubspot_token: tokens.access_token,
        hubspot_refresh_token: tokens.refresh_token,
        hubspot_last_sync: new Date().toISOString(),
      })
      .eq('id', customer.id)

    // Trigger initial sync
    const syncEngine = new SyncEngine(customer.id)
    // Don't await sync to avoid timeout
    syncEngine.syncAll().catch(err => console.error('Background sync failed:', err))

    return NextResponse.redirect(new URL('/settings', request.url))
  } catch (error: any) {
    console.error('HubSpot callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?error=callback_failed', request.url)
    )
  }
}

