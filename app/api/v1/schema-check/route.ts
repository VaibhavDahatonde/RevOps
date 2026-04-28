import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServiceClient()
    
    // Check tables existence by selecting 1 row (limit 0 to just check schema)
    const checks = [
      supabase.from('activities').select('id').limit(1),
      supabase.from('events').select('id').limit(1),
      supabase.from('ai_insights').select('id').limit(1),
      supabase.from('integrations').select('id').limit(1),
      supabase.from('contacts').select('is_decision_maker').limit(1), // Check new column
      supabase.from('opportunities').select('risk_factors').limit(1), // Check new column
    ]
    
    const results = await Promise.allSettled(checks)
    
    const status = {
      activities_table: results[0].status === 'fulfilled' && !results[0].value.error,
      events_table: results[1].status === 'fulfilled' && !results[1].value.error,
      ai_insights_table: results[2].status === 'fulfilled' && !results[2].value.error,
      integrations_table: results[3].status === 'fulfilled' && !results[3].value.error,
      contacts_columns: results[4].status === 'fulfilled' && !results[4].value.error,
      opportunities_columns: results[5].status === 'fulfilled' && !results[5].value.error,
    }

    const allHealthy = Object.values(status).every(Boolean)

    if (!allHealthy) {
        console.error('Schema verification failed:', status)
        // Log specific errors if available
        results.forEach((res, idx) => {
            if (res.status === 'fulfilled' && res.value.error) {
                console.error(`Check ${idx} failed:`, res.value.error.message)
            }
        })
    }

    return NextResponse.json({ 
      healthy: allHealthy,
      schema_status: status,
      timestamp: new Date().toISOString()
    }, { status: allHealthy ? 200 : 500 })

  } catch (error: any) {
    return NextResponse.json({ 
      healthy: false, 
      error: error.message 
    }, { status: 500 })
  }
}
