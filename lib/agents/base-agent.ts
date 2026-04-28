import { createServiceClient } from '../supabase/server'
import { analyzeWithGemini } from '../integrations/gemini'
import type { Customer, Opportunity } from '../types/database'

export interface AgentAction {
  type: 'update_field' | 'send_alert' | 'create_task' | 'schedule_meeting' | 'adjust_forecast' | 'escalate'
  targetType: 'opportunity' | 'customer' | 'metric' | 'insight'
  targetId: string
  description: string
  fieldChanged?: string
  oldValue?: string
  newValue?: string
  reason: string
  confidence: number
  metadata?: any
}

export interface AgentResult {
  success: boolean
  actionsExecuted: number
  actionsFailed: number
  actions: AgentAction[]
  error?: string
}

export abstract class BaseAgent {
  protected customerId: string
  protected customer: Customer | null = null
  protected agentType: string
  protected runId: string | null = null
  protected requiresApproval: boolean = false

  constructor(customerId: string, agentType: string, requiresApproval = false) {
    this.customerId = customerId
    this.agentType = agentType
    this.requiresApproval = requiresApproval
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract analyze(): Promise<AgentAction[]>

  /**
   * Run the agent with full audit trail
   */
  async run(): Promise<AgentResult> {
    const startTime = Date.now()
    const supabase = await createServiceClient()

    try {
      // Create agent run record
      const { data: agentRun, error: runError } = await supabase
        .from('agent_runs')
        .insert({
          customer_id: this.customerId,
          agent_type: this.agentType,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (runError) throw new Error(`Failed to create agent run: ${runError.message}`)
      this.runId = agentRun.id

      // Load customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', this.customerId)
        .single()

      this.customer = customer

      // Run analysis
      const actions = await this.analyze()

      // Execute actions
      let actionsExecuted = 0
      let actionsFailed = 0

      for (const action of actions) {
        try {
          await this.executeAction(action)
          actionsExecuted++
        } catch (error: any) {
          console.error(`Action execution failed:`, error)
          actionsFailed++
          
          // Log failed action
          await this.logAction({
            ...action,
            status: 'failed',
            error: error.message,
          })
        }
      }

      // Update agent run
      const executionTime = Date.now() - startTime
      await supabase
        .from('agent_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          actions_taken: actionsExecuted,
          errors_encountered: actionsFailed,
          execution_time_ms: executionTime,
          impact_summary: {
            actions_executed: actionsExecuted,
            actions_failed: actionsFailed,
          },
        })
        .eq('id', this.runId)

      return {
        success: true,
        actionsExecuted,
        actionsFailed,
        actions,
      }
    } catch (error: any) {
      console.error(`Agent ${this.agentType} failed:`, error)

      // Mark run as failed
      if (this.runId) {
        await supabase
          .from('agent_runs')
          .update({
            completed_at: new Date().toISOString(),
            status: 'failed',
            error_details: error.message,
          })
          .eq('id', this.runId)
      }

      return {
        success: false,
        actionsExecuted: 0,
        actionsFailed: 0,
        actions: [],
        error: error.message,
      }
    }
  }

  /**
   * Execute a single action with safety checks
   */
  protected async executeAction(action: AgentAction): Promise<void> {
    const supabase = await createServiceClient()

    // Validate action
    if (!this.validateAction(action)) {
      throw new Error('Action validation failed')
    }

    // Execute based on action type
    switch (action.type) {
      case 'update_field':
        await this.updateField(action)
        break
      case 'send_alert':
        await this.sendAlert(action)
        break
      case 'create_task':
        await this.createTask(action)
        break
      case 'adjust_forecast':
        await this.adjustForecast(action)
        break
      default:
        console.log(`Action type ${action.type} queued for future implementation`)
    }

    // Log action
    await this.logAction({
      ...action,
      status: 'executed',
    })
  }

  /**
   * Update a field in the database
   */
  protected async updateField(action: AgentAction): Promise<void> {
    const supabase = await createServiceClient()

    if (!action.fieldChanged || !action.newValue) {
      throw new Error('Field update requires fieldChanged and newValue')
    }

    // Get table name from target type
    const tableName = action.targetType === 'opportunity' ? 'opportunities' : action.targetType + 's'

    // Update the field
    const { error } = await supabase
      .from(tableName)
      .update({
        [action.fieldChanged]: action.newValue,
      })
      .eq('id', action.targetId)

    if (error) throw new Error(`Failed to update field: ${error.message}`)
  }

  /**
   * Send an alert/notification
   */
  protected async sendAlert(action: AgentAction): Promise<void> {
    const supabase = await createServiceClient()

    // Create insight as alert
    await supabase.from('insights').insert({
      customer_id: this.customerId,
      type: 'alert',
      severity: action.metadata?.severity || 'medium',
      title: action.description,
      message: action.reason,
      recommended_action: action.metadata?.recommendedAction || 'Review this item',
      status: 'active',
    })
  }

  /**
   * Create a task (logged as insight for now)
   */
  protected async createTask(action: AgentAction): Promise<void> {
    const supabase = await createServiceClient()

    // Create task as insight
    await supabase.from('insights').insert({
      customer_id: this.customerId,
      type: 'opportunity',
      severity: 'high',
      title: `Task: ${action.description}`,
      message: action.reason,
      recommended_action: action.metadata?.taskDescription || action.description,
      status: 'active',
    })
  }

  /**
   * Adjust forecast
   */
  protected async adjustForecast(action: AgentAction): Promise<void> {
    const supabase = await createServiceClient()

    if (action.targetType === 'opportunity' && action.fieldChanged === 'close_date') {
      await supabase
        .from('opportunities')
        .update({
          close_date: action.newValue,
          predicted_close_date: action.newValue,
        })
        .eq('id', action.targetId)
    }
  }

  /**
   * Log action to database for audit trail
   */
  protected async logAction(action: AgentAction & { status?: string; error?: string }): Promise<void> {
    const supabase = await createServiceClient()

    await supabase.from('automated_actions').insert({
      customer_id: this.customerId,
      agent_type: this.agentType,
      action_type: action.type,
      target_type: action.targetType,
      target_id: action.targetId,
      action_description: action.description,
      field_changed: action.fieldChanged || null,
      old_value: action.oldValue || null,
      new_value: action.newValue || null,
      reason: action.reason,
      confidence_score: action.confidence,
      status: action.status || (this.requiresApproval ? 'pending_approval' : 'executed'),
      requires_approval: this.requiresApproval,
      metadata: action.metadata || {},
      error_message: action.error || null,
    })
  }

  /**
   * Validate action before execution
   */
  protected validateAction(action: AgentAction): boolean {
    // Confidence threshold
    if (action.confidence < 60) {
      console.log(`Action confidence too low: ${action.confidence}%`)
      return false
    }

    // Must have description and reason
    if (!action.description || !action.reason) {
      console.log('Action missing description or reason')
      return false
    }

    return true
  }

  /**
   * Use AI to make decisions
   */
  protected async askAI(prompt: string): Promise<string> {
    return await analyzeWithGemini(prompt)
  }

  /**
   * Get opportunities for this customer
   */
  protected async getOpportunities(): Promise<Opportunity[]> {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('opportunities')
      .select('*')
      .eq('customer_id', this.customerId)

    return data || []
  }
}
