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
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    // Verify customer belongs to user
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get active insights
    const { data: insights, error } = await supabase
      .from('insights')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('detected_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      )
    }

    return NextResponse.json({ insights: insights || [] })
  } catch (error: any) {
    console.error('Insights API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { insightId, status } = body

    if (!insightId || !status) {
      return NextResponse.json(
        { error: 'insightId and status required' },
        { status: 400 }
      )
    }

    // Get insight and verify it belongs to user's customer
    const { data: insight } = await supabase
      .from('insights')
      .select('customer_id')
      .eq('id', insightId)
      .single()

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
    }

    // Verify customer belongs to user
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', insight.customer_id)
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update insight
    const { error } = await supabase
      .from('insights')
      .update({ status })
      .eq('id', insightId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update insight' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update insight error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update insight' },
      { status: 500 }
    )
  }
}
