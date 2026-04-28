'use client'

import { useState, useEffect } from 'react'
import { Clock, Check, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface AutomatedAction {
  id: string
  agent_type: string
  action_type: string
  action_description: string
  reason: string
  confidence_score: number
  status: string
  field_changed?: string
  old_value?: string
  new_value?: string
  executed_at: string
}

export default function AgentActivityLog() {
  const [actions, setActions] = useState<AutomatedAction[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadActions()
  }, [])

  const loadActions = async () => {
    try {
      const response = await fetch('/api/agents/actions?limit=20')
      if (response.ok) {
        const data = await response.json()
        setActions(data.actions || [])
      }
    } catch (error) {
      console.error('Failed to load actions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAgentIcon = (agentType: string) => {
    const icons: { [key: string]: string } = {
      data_hygiene: '🧹',
      deal_risk: '⚠️',
      forecast: '📊',
    }
    return icons[agentType] || '🤖'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
        return 'text-green-400 bg-green-500/20'
      case 'failed':
        return 'text-red-400 bg-red-500/20'
      case 'rolled_back':
        return 'text-yellow-400 bg-yellow-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return <Check className="w-4 h-4" />
      case 'failed':
        return <X className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="text-white">Loading activity...</div>
      </div>
    )
  }

  const displayActions = expanded ? actions : actions.slice(0, 5)

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent AI Activity</h3>
        <Clock className="w-5 h-5 text-gray-400" />
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No AI activity yet</p>
          <p className="text-sm mt-1">Run agents to see actions here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayActions.map((action) => (
            <div
              key={action.id}
              className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Agent Icon */}
                <div className="text-2xl flex-shrink-0">
                  {getAgentIcon(action.agent_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {action.action_description}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {action.reason}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(action.status)}`}
                    >
                      {getStatusIcon(action.status)}
                      <span className="capitalize">{action.status}</span>
                    </div>
                  </div>

                  {/* Field Change Details */}
                  {action.field_changed && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-400">Changed </span>
                      <span className="text-purple-300 font-mono">{action.field_changed}</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-gray-500 line-through">
                        {action.old_value || 'null'}
                      </span>
                      <span className="text-gray-400"> → </span>
                      <span className="text-green-400">{action.new_value}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="capitalize">
                      {action.agent_type.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span>Confidence: {action.confidence_score}%</span>
                    <span>•</span>
                    <span>{new Date(action.executed_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Show More/Less Button */}
          {actions.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show More ({actions.length - 5} more)
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
