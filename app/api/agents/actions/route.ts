import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agents/actions
 * Get automated action history with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agentType')
    const actionType = searchParams.get('actionType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('automated_actions')
      .select('*')
      .eq('customer_id', customer.id)
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (agentType) {
      query = query.eq('agent_type', agentType)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: actions, error } = await query

    if (error) throw error

    // Get summary stats
    const { data: stats } = await supabase
      .from('automated_actions')
      .select('action_type, status')
      .eq('customer_id', customer.id)

    const summary = {
      total: stats?.length || 0,
      executed: stats?.filter(a => a.status === 'executed').length || 0,
      failed: stats?.filter(a => a.status === 'failed').length || 0,
      pending: stats?.filter(a => a.status === 'pending_approval').length || 0,
      byType: stats?.reduce((acc: any, a) => {
        acc[a.action_type] = (acc[a.action_type] || 0) + 1
        return acc
      }, {}),
    }

    return NextResponse.json({
      actions,
      summary,
    })
  } catch (error: any) {
    console.error('Failed to fetch actions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch actions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agents/actions/rollback
 * Rollback a specific action
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { actionId } = body

    if (!actionId) {
      return NextResponse.json({ error: 'actionId required' }, { status: 400 })
    }

    // Get action
    const { data: action, error: fetchError } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', actionId)
      .single()

    if (fetchError || !action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Rollback the action if possible
    if (action.action_type === 'update_field' && action.field_changed && action.old_value) {
      // Get table name
      const tableName = action.target_type === 'opportunity' ? 'opportunities' : action.target_type + 's'

      // Revert the change
      await supabase
        .from(tableName)
        .update({
          [action.field_changed]: action.old_value,
        })
        .eq('id', action.target_id)

      // Mark action as rolled back
      await supabase
        .from('automated_actions')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
        })
        .eq('id', actionId)

      return NextResponse.json({
        success: true,
        message: 'Action rolled back successfully',
      })
    }

    return NextResponse.json(
      { error: 'Action cannot be rolled back' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Rollback error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to rollback action' },
      { status: 500 }
    )
  }
}
