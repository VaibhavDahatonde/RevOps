import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Validate an invitation code
 * GET /api/invitations/validate?code=ABC123
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Invitation code required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if invitation exists and is valid
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !invitation) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invitation code',
      })
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Invitation has expired',
      })
    }

    // Check if already used up
    if (invitation.uses_count >= invitation.max_uses) {
      return NextResponse.json({
        valid: false,
        error: 'Invitation has been fully used',
      })
    }

    // Check status
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        valid: false,
        error: 'Invitation is no longer valid',
      })
    }

    // Valid!
    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        notes: invitation.notes,
      },
    })
  } catch (error: any) {
    console.error('Validate invitation error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Validation failed' },
      { status: 500 }
    )
  }
}
