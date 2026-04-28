'use client'

import { useState, useEffect } from 'react'
import { Bot, TrendingUp, Database, AlertTriangle, Calendar, Activity } from 'lucide-react'

interface ImpactMetrics {
  totalActionsLast30Days: number
  totalAIInterventions: number
  pipelineHygieneScore: number
  fieldsAutoFilled: number
  dataQualityImprovement: string
  highRiskDealsCount: number
  averageRiskScore: number
  alertsSent: number
  forecastAdjustmentsMade: number
  forecastAccuracyPercent: number
  last7DaysActions: number
  byAgent: {
    data_hygiene: number
    deal_risk: number
    forecast: number
  }
}

interface AIAgentImpactProps {
  customerId: string
}

export default function AIAgentImpact({ customerId }: AIAgentImpactProps) {
  const [impact, setImpact] = useState<ImpactMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    loadImpact()
  }, [customerId])

  const loadImpact = async () => {
    try {
      const response = await fetch('/api/agents/impact')
      if (response.ok) {
        const data = await response.json()
        setImpact(data.impact)
      }
    } catch (error) {
      console.error('Failed to load impact:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAgents = async () => {
    setRunning(true)
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ AI Agents executed ${data.totalActions} actions!`)
        await loadImpact()
      } else {
        const error = await response.json()
        alert(`❌ Failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to run agents:', error)
      alert('Failed to run AI agents')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="text-white">Loading AI impact...</div>
      </div>
    )
  }

  if (!impact) return null

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-lg border border-purple-500/30 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-3 rounded-lg">
            <Bot className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Agent Impact</h2>
            <p className="text-sm text-gray-300">Last 30 days</p>
          </div>
        </div>
        <button
          onClick={runAgents}
          disabled={running}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
        >
          <Activity className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
          {running ? 'Running...' : 'Run AI Agents'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Actions */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Total AI Actions</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {impact.totalActionsLast30Days}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {impact.last7DaysActions} in last 7 days
          </div>
        </div>

        {/* Data Quality */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Pipeline Hygiene</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {impact.pipelineHygieneScore}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {impact.fieldsAutoFilled} fields auto-filled
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Alerts Sent</span>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {impact.alertsSent}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {impact.highRiskDealsCount} high-risk deals
          </div>
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 text-sm">Actions by Agent</h3>
        <div className="space-y-2">
          {/* Data Hygiene */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Data Hygiene Agent</span>
            </div>
            <span className="text-white font-semibold">{impact.byAgent.data_hygiene}</span>
          </div>

          {/* Deal Risk */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300 text-sm">Deal Risk Agent</span>
            </div>
            <span className="text-white font-semibold">{impact.byAgent.deal_risk}</span>
          </div>

          {/* Forecast */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300 text-sm">Forecast Agent</span>
            </div>
            <span className="text-white font-semibold">{impact.byAgent.forecast}</span>
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="mt-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-white font-semibold text-sm">
              AI is actively improving your pipeline
            </div>
            <div className="text-gray-300 text-xs mt-1">
              {impact.fieldsAutoFilled} missing fields filled • {impact.alertsSent} proactive alerts sent • {impact.forecastAdjustmentsMade} forecast adjustments
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
