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

    // Get opportunities
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('customer_id', customerId)
      .order('amount', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      )
    }

    return NextResponse.json({ opportunities: opportunities || [] })
  } catch (error: any) {
    console.error('Opportunities API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}

