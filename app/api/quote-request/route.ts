import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { 
      fullName, 
      email, 
      companyName, 
      companySize, 
      currentCrm,
      estimatedPipelineValue,
      numUsers,
      primaryChallenges
    } = body

    if (!fullName || !email || !companyName || !companySize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Create Supabase admin client (service role)
    const supabase = await createServiceClient()

    // Insert quote request
    const { data, error } = await supabase
      .from('quote_requests')
      .insert({
        full_name: fullName,
        email: email.toLowerCase(),
        company_name: companyName,
        phone: body.phone || null,
        company_size: companySize,
        industry: body.industry || null,
        current_crm: currentCrm || [],
        estimated_pipeline_value: estimatedPipelineValue || null,
        num_users: numUsers || null,
        annual_revenue: body.annualRevenue || null,
        primary_challenges: primaryChallenges || [],
        additional_notes: body.additionalNotes || null,
        source: body.source || 'website',
        utm_source: body.utmSource || null,
        utm_medium: body.utmMedium || null,
        utm_campaign: body.utmCampaign || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating quote request:', error)
      return NextResponse.json(
        { error: 'Failed to submit quote request' },
        { status: 500 }
      )
    }

    // TODO: Send notification email to sales team
    // TODO: Add to CRM (HubSpot/Salesforce)
    // TODO: Send confirmation email to customer

    return NextResponse.json({
      success: true,
      message: 'Quote request submitted successfully',
      estimatedValue: data.estimated_value,
      id: data.id
    })

  } catch (error: any) {
    console.error('Quote request error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve quote requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    
    // Check if user is authenticated (you might want admin-only access)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    // Build query
    let query = supabase
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching quote requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quote requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({ quotes: data })

  } catch (error: any) {
    console.error('Quote requests fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
