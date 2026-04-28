import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Mark invitation as accepted after successful signup
 * POST /api/invitations/accept
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const body = await request.json()

    const { code, userId } = body

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Code and user ID required' },
        { status: 400 }
      )
    }

    // Get invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', code)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Update invitation
    const newUsesCount = invitation.uses_count + 1
    const newStatus =
      newUsesCount >= invitation.max_uses ? 'accepted' : 'pending'

    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        uses_count: newUsesCount,
        status: newStatus,
        used_by_user_id: userId,
        used_at: new Date().toISOString(),
      })
      .eq('code', code)

    if (updateError) {
      console.error('Accept invitation error:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
