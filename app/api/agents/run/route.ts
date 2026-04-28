import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAllAgents, runAgent } from '@/lib/agents'

/**
 * POST /api/agents/run
 * Trigger AI agents to analyze and take action
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await request.json()
    const { agentType } = body // Optional: run specific agent

    // Run agents
    let result
    if (agentType) {
      // Run specific agent
      const agentResult = await runAgent(customer.id, agentType)
      result = {
        success: agentResult.success,
        results: { [agentType]: agentResult },
        totalActions: agentResult.actionsExecuted,
      }
    } else {
      // Run all agents
      result = await runAllAgents(customer.id)
    }

    return NextResponse.json({
      success: result.success,
      message: `Agents executed ${result.totalActions} actions`,
      results: result.results,
      totalActions: result.totalActions,
    })
  } catch (error: any) {
    console.error('Agent execution error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run agents' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/run
 * Get agent run history
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

    // Get recent agent runs
    const { data: runs, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('customer_id', customer.id)
      .order('started_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ runs })
  } catch (error: any) {
    console.error('Failed to fetch agent runs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent runs' },
      { status: 500 }
    )
  }
}
