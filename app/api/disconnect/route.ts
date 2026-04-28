import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { source } = body

    const validSources = ['salesforce', 'hubspot', 'gong', 'outreach', 'salesloft']
    if (!source || !validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updateData: any = {}
    
    switch (source) {
      case 'salesforce':
        updateData.salesforce_connected = false
        updateData.salesforce_token = null
        updateData.salesforce_refresh_token = null
        updateData.salesforce_instance_url = null
        updateData.salesforce_last_sync = null
        break
      case 'hubspot':
        updateData.hubspot_connected = false
        updateData.hubspot_token = null
        updateData.hubspot_refresh_token = null
        updateData.hubspot_last_sync = null
        break
      case 'gong':
        updateData.gong_connected = false
        updateData.gong_token = null
        updateData.gong_refresh_token = null
        updateData.gong_last_sync = null
        break
      case 'outreach':
        updateData.outreach_connected = false
        updateData.outreach_token = null
        updateData.outreach_refresh_token = null
        updateData.outreach_last_sync = null
        break
      case 'salesloft':
        updateData.salesloft_connected = false
        updateData.salesloft_token = null
        updateData.salesloft_refresh_token = null
        updateData.salesloft_last_sync = null
        break
    }

    const { error } = await serviceSupabase
      .from('customers')
      .update(updateData)
      .eq('id', customer.id)

    if (error) {
      console.error('Disconnect error:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Disconnect API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
