import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Create a new invitation
 * POST /api/invitations/create
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const body = await request.json()

    const {
      email,
      notes,
      expiresInDays = 30,
      maxUses = 1,
    } = body

    // Generate unique invite code
    const { data: codeData } = await supabase.rpc('generate_invite_code')
    const code = codeData

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        code,
        email: email || null,
        notes: notes || null,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Create invitation error:', error)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Generate invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/signup?invite=${code}`

    return NextResponse.json({
      invitation,
      inviteUrl,
    })
  } catch (error: any) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
