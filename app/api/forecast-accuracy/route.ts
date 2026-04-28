import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateForecastAccuracy } from '@/lib/forecast-accuracy'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer for this user
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get days range from query params (default 90)
    const { searchParams } = new URL(request.url)
    const daysRange = parseInt(searchParams.get('days') || '90')

    // Calculate forecast accuracy
    const accuracyData = await calculateForecastAccuracy(customer.id, daysRange)

    return NextResponse.json(accuracyData)
  } catch (error: any) {
    console.error('Forecast accuracy API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate forecast accuracy' },
      { status: 500 }
    )
  }
}
