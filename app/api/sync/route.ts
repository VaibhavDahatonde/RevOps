import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLogger } from '@/lib/utils/logger'
import { SyncEngine } from '@/lib/sync-engine'

const logger = getLogger('sync-api')

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user FIRST - this is critical
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.error('Sync failed - unauthorized user', { error: authError?.message })
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      logger.error('Sync failed - missing customerId', { userId: user.id })
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    // CRITICAL: Get customer by user_id, not by customerId 
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      logger.error('Sync failed - customer not found', { 
        userId: user.id, 
        customerId, 
        error: customerError?.message 
      })
      return NextResponse.json({ 
        error: 'Customer not found - please complete onboarding first',
        details: customerError?.message
      }, { status: 404 })
    }

    // Use the authenticated customer's ID from database
    const actualCustomerId = customer.id
    
    logger.info('Starting sync', { 
      userId: user.id, 
      customerId: actualCustomerId,
      hasSalesforce: !!customer.salesforce_connected,
      hasHubspot: !!customer.hubspot_connected
    })
    
    // Initialize Sync Engine with authenticated customer
    const syncEngine = new SyncEngine(actualCustomerId)
    
    // Execute sync with error handling
    try {
      const result = await syncEngine.syncAll()
      
      if (!result.success) {
        throw new Error(result.error || 'Sync failed without specific error')
      }

      // Update customer sync time
      await supabase
        .from('customers')
        .update({ 
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', actualCustomerId)

      logger.info('Sync completed successfully', { 
        customerId: actualCustomerId,
        syncedAt: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        customerId: actualCustomerId,
        syncedAt: new Date().toISOString(),
        integrations: {
          salesforce: customer.salesforce_connected,
          hubspot: customer.hubspot_connected
        }
      })

    } catch (syncError: any) {
      logger.error('Sync engine failed', { 
        error: syncError.message, 
        customerId: actualCustomerId,
        stack: syncError.stack
      })
      throw syncError
    }

  } catch (error: any) {
    logger.error('Sync failed with error', { 
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Sync failed',
        message: error.message || 'Unknown error during sync',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
