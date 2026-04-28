import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunityId')

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId required' }, { status: 400 })
    }

    // Fetch opportunity details
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Verify customer belongs to user
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', opportunity.customer_id)
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch detailed risk score
    const { data: riskDetails, error: riskError } = await supabase
      .from('deal_risk_scores')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .single()

    if (riskError) {
      console.error('Risk details fetch error:', riskError)
    }

    // Fetch recent call analyses for this deal
    const { data: recentCalls, error: callsError } = await supabase
      .from('call_analyses')
      .select('*')
      .eq('deal_id', opportunity.external_id) // Assuming matching by external_id
      .order('created_at', { ascending: false })
      .limit(5)

    if (callsError) {
        console.error('Failed to fetch calls:', callsError)
    }

    return NextResponse.json({ 
      opportunity,
      riskDetails: riskDetails || null,
      recentCalls: recentCalls || []
    })
  } catch (error: any) {
    console.error('Risk details API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch risk details' },
      { status: 500 }
    )
  }
}
