import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let serviceSupabase
    try {
      serviceSupabase = await createServiceClient()
    } catch (err: any) {
      console.error('Service client error:', err.message)
      // Fall back to regular client if service role key is missing
      serviceSupabase = supabase
    }

    // First, try to fetch existing customer (most common case)
    const { data: existingCustomer, error: fetchError } = await serviceSupabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingCustomer) {
      // Return existing customer
      const responseCustomer = {
        ...existingCustomer,
        id: existingCustomer.user_id,
        name: existingCustomer.company_name || 'User',
      }
      return NextResponse.json({ customer: responseCustomer })
    }

    // Customer doesn't exist, create one
    if (fetchError?.code === 'PGRST116') {
      const { data: newCustomer, error: insertError } = await serviceSupabase
        .from('customers')
        .insert({
          user_id: user.id,
          email: user.email || '',
          company_name: user.user_metadata?.full_name || 
                       (user.email ? user.email.split('@')[0] : 'User'),
          subscription_tier: 'FREE',
          salesforce_connected: false,
          hubspot_connected: false,
          skip_onboarding: false,
        })
        .select()
        .single()

      if (insertError) {
        // If duplicate key error, try fetching again
        if (insertError.code === '23505') {
          const { data: retryCustomer } = await serviceSupabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (retryCustomer) {
            const responseCustomer = {
              ...retryCustomer,
              id: retryCustomer.user_id,
              name: retryCustomer.company_name || 'User',
            }
            return NextResponse.json({ customer: responseCustomer })
          }
        }
        console.error('Create customer error:', insertError)
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
      }

      const responseCustomer = {
        ...newCustomer,
        id: newCustomer.user_id,
        name: newCustomer.company_name || 'User',
      }
      return NextResponse.json({ customer: responseCustomer })
    }

    // Other fetch error
    console.error('Fetch customer error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })

  } catch (error: any) {
    console.error('Customer API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
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
    const allowedFields = ['skip_onboarding', 'company_name', 'email']
    
    // Filter allowed fields
    const updateData: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update customer record
    const { data: customer, error } = await serviceSupabase
      .from('customers')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update customer error:', error)
      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      )
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Return customer with backward compatibility and proper ID mapping
    const responseCustomer = {
      ...customer,
      id: customer.user_id, // Map user_id to id for frontend compatibility
      name: customer.company_name || 'User', // Map company_name to name for backward compatibility
    }
    return NextResponse.json({ customer: responseCustomer })
  } catch (error: any) {
    console.error('Customer PATCH API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    )
  }
}

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

    // Use simple insert-then-fetch approach (avoid RPC until migration is applied)
    try {
      // Try to insert first
      const { data: insertedCustomer, error: insertError } = await serviceSupabase
        .from('customers')
        .insert({
          user_id: user.id,
          email: user.email || '',
          company_name: user.user_metadata?.full_name || 
                       (user.email && user.email.split('@')[0]) || 'User',
          subscription_tier: 'FREE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!insertError && insertedCustomer) {
        // Return customer with backward compatibility
        const responseCustomer = {
          ...insertedCustomer,
          id: insertedCustomer.user_id,
          name: insertedCustomer.company_name || 'User',
        }
        return NextResponse.json({ customer: responseCustomer })
      }

      // If insert failed due to uniqueness, fetch existing
      if (insertError?.code === '23505') {
        const { data: existingCustomer, error: fetchError } = await serviceSupabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          console.error('Failed to fetch existing customer:', fetchError)
          return NextResponse.json(
            { 
              error: 'Failed to retrieve existing customer',
              details: fetchError.message || 'Unknown error'
            },
            { status: 500 }
          )
        }

        if (!existingCustomer) {
          console.error('Critical: No customer record found after constraint violation')
          return NextResponse.json(
            { error: 'Failed to create customer record' },
            { status: 500 }
          )
        }

        // Update last activity
        await serviceSupabase
          .from('customers')
          .update({ last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        // Return existing customer with backward compatibility
        const responseCustomer = {
          ...existingCustomer,
          id: existingCustomer.user_id,
          name: existingCustomer.company_name || 'User',
        }
        return NextResponse.json({ customer: responseCustomer })
      }

      // Other insert error
      console.error('Create customer error:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to create customer',
          details: insertError?.message || 'Unknown error'
        },
        { status: 500 }
      )

    } catch (err: any) {
      console.error('Customer creation error:', err)
      return NextResponse.json(
        { 
          error: 'Customer creation failed',
          details: err?.message || 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Create customer API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    )
  }
}
