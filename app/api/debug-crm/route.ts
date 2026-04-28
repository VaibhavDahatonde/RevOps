// Debug API to check CRM connection status and data
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer with CRM connections
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check CRM connections
    const connections = {
      salesforce: {
        connected: customer.salesforce_connected || false,
        lastSync: customer.salesforce_last_sync,
        hasToken: !!customer.salesforce_token,
        instanceUrl: customer.salesforce_instance_url
      },
      hubspot: {
        connected: customer.hubspot_connected || false,
        lastSync: customer.hubspot_last_sync,
        hasToken: !!customer.hubspot_token
      }
    }

    // Check data in database
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('customer_id', customer.id)
      .limit(10)

    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('customer_id', customer.id)
      .limit(5)

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        company: customer.company_name
      },
      connections,
      dataStatus: {
        opportunities: {
          count: opportunities?.length || 0,
          sample: opportunities?.slice(0, 3) || []
        },
        insights: {
          count: insights?.length || 0,
          sample: insights?.slice(0, 2) || []
        }
      },
      recommendations: {
        nextSteps: [],
        issues: []
      }
    })

  } catch (error: any) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
