import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { exchangeSalesforceCode } from '@/lib/integrations/salesforce'
import { SyncEngine } from '@/lib/sync-engine'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL('/onboarding?error=salesforce_auth_failed', request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/onboarding?error=no_code', request.url)
      )
    }

    // Get code_verifier from cookie
    const cookieStore = await cookies()
    const codeVerifier = cookieStore.get('sf_code_verifier')?.value

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/onboarding?error=missing_code_verifier', request.url)
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
      process.env.SALESFORCE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/salesforce`

    // Exchange code for tokens with PKCE verifier
    const tokens = await exchangeSalesforceCode(code, redirectUri, codeVerifier)

    // Update customer record
    await supabase
      .from('customers')
      .update({
        salesforce_connected: true,
        salesforce_token: tokens.access_token,
        salesforce_refresh_token: tokens.refresh_token,
        salesforce_instance_url: tokens.instance_url,
        salesforce_last_sync: new Date().toISOString(),
      })
      .eq('id', customer.id)

    // Trigger initial sync
    const syncEngine = new SyncEngine(customer.id)
    // Don't await sync to avoid timeout
    syncEngine.syncAll().catch(err => console.error('Background sync failed:', err))

    // Clear the code verifier cookie and redirect
    const response = NextResponse.redirect(new URL('/settings', request.url))
    response.cookies.delete('sf_code_verifier')
    return response
  } catch (error: any) {
    console.error('Salesforce callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?error=callback_failed', request.url)
    )
  }
}

