'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, AlertCircle, CheckCircle, TrendingUp, Clock, Activity, FileText, Mail, Edit, Bell } from 'lucide-react'
import RiskBadge from './RiskBadge'
import LoadingSpinner from './LoadingSpinner'

interface DealRiskModalProps {
  opportunityId: string
  onClose: () => void
}

interface RecommendedAction {
  type: 'contact' | 'update' | 'schedule' | 'escalate'
  priority: 'critical' | 'high' | 'medium'
  action: string
  reason: string
}

interface RiskDetails {
  id: string
  opportunity_id: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  stale_activity_score: number
  velocity_score: number
  stage_time_score: number
  missing_data_score: number
  days_since_last_activity: number | null
  days_in_current_stage: number
  velocity_vs_average: number
  missing_fields: string[]
  predicted_close_date: string | null
  likelihood_to_close: number
  likelihood_to_slip: number
  recommended_actions: RecommendedAction[]
  calculated_at: string
}

interface CallAnalysis {
  call_id: string
  overall_sentiment: 'positive' | 'neutral' | 'negative'
  sentiment_score: number
  competitor_mentions: string[]
  topics: string[]
  action_items: string[]
  recording_url?: string
  created_at: string
}

interface Opportunity {
  id: string
  name: string
  amount: number
  stage: string | null
  close_date: string | null
  owner_name: string | null
  account_name: string | null
  risk_score: number | null
  risk_level: 'low' | 'medium' | 'high' | null
  created_at: string
  updated_at: string
}

export default function DealRiskModal({ opportunityId, onClose }: DealRiskModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [riskDetails, setRiskDetails] = useState<RiskDetails | null>(null)
  const [recentCalls, setRecentCalls] = useState<CallAnalysis[]>([])

  useEffect(() => {
    fetchRiskDetails()
  }, [opportunityId])

  const fetchRiskDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/risk-details?opportunityId=${opportunityId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch risk details')
      }
      
      const data = await response.json()
      setOpportunity(data.opportunity)
      setRiskDetails(data.riskDetails)
      setRecentCalls(data.recentCalls || [])
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load risk details')
    } finally {
      setLoading(false)
    }
  }

  const getRiskFactorColor = (score: number) => {
    if (score >= 25) return 'text-red-400'
    if (score >= 15) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getRiskFactorBg = (score: number) => {
    if (score >= 25) return 'bg-red-500/20'
    if (score >= 15) return 'bg-yellow-500/20'
    return 'bg-green-500/20'
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'high': return <AlertCircle className="w-4 h-4 text-yellow-400" />
      default: return <CheckCircle className="w-4 h-4 text-blue-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-200'
      case 'high': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
      default: return 'bg-blue-500/20 border-blue-500/50 text-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/20 rounded-xl p-8 max-w-2xl w-full">
          <LoadingSpinner message="Loading risk details..." />
        </div>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/20 rounded-xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Error</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-red-300">{error || 'Deal not found'}</p>
          <button
            onClick={onClose}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/20 rounded-xl p-8 max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{opportunity.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>${((opportunity.amount || 0) / 1000).toFixed(0)}K</span>
              <span>•</span>
              <span>{opportunity.stage || 'No stage'}</span>
              {opportunity.owner_name && (
                <>
                  <span>•</span>
                  <span>{opportunity.owner_name}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {riskDetails && (
              <RiskBadge riskScore={riskDetails.risk_score} riskLevel={riskDetails.risk_level} size="lg" showScore={true} />
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {!riskDetails ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300">Risk analysis not available for this deal yet.</p>
            <p className="text-sm text-gray-500 mt-2">Risk scores are calculated during the next sync.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Risk Score Breakdown */}
            <div className="bg-white/10 border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Risk Score Breakdown
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Stale Activity */}
                <div className={`${getRiskFactorBg(riskDetails.stale_activity_score)} border border-white/10 rounded-lg p-4`}>
                  <Activity className={`w-5 h-5 mb-2 ${getRiskFactorColor(riskDetails.stale_activity_score)}`} />
                  <div className="text-2xl font-bold text-white">{riskDetails.stale_activity_score}</div>
                  <div className="text-xs text-gray-400 mt-1">Stale Activity</div>
                  {riskDetails.days_since_last_activity !== null && (
                    <div className="text-xs text-gray-500 mt-1">
                      {riskDetails.days_since_last_activity} days ago
                    </div>
                  )}
                </div>

                {/* Stage Time */}
                <div className={`${getRiskFactorBg(riskDetails.stage_time_score)} border border-white/10 rounded-lg p-4`}>
                  <Clock className={`w-5 h-5 mb-2 ${getRiskFactorColor(riskDetails.stage_time_score)}`} />
                  <div className="text-2xl font-bold text-white">{riskDetails.stage_time_score}</div>
                  <div className="text-xs text-gray-400 mt-1">Stage Time</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {riskDetails.days_in_current_stage} days in stage
                  </div>
                </div>

                {/* Velocity */}
                <div className={`${getRiskFactorBg(riskDetails.velocity_score)} border border-white/10 rounded-lg p-4`}>
                  <TrendingUp className={`w-5 h-5 mb-2 ${getRiskFactorColor(riskDetails.velocity_score)}`} />
                  <div className="text-2xl font-bold text-white">{riskDetails.velocity_score}</div>
                  <div className="text-xs text-gray-400 mt-1">Velocity</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(riskDetails.velocity_vs_average * 100).toFixed(0)}% of avg
                  </div>
                </div>

                {/* Missing Data */}
                <div className={`${getRiskFactorBg(riskDetails.missing_data_score)} border border-white/10 rounded-lg p-4`}>
                  <FileText className={`w-5 h-5 mb-2 ${getRiskFactorColor(riskDetails.missing_data_score)}`} />
                  <div className="text-2xl font-bold text-white">{riskDetails.missing_data_score}</div>
                  <div className="text-xs text-gray-400 mt-1">Missing Data</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {riskDetails.missing_fields.length} fields
                  </div>
                </div>
              </div>
            </div>

            {/* Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Likelihood to Close</div>
                <div className="text-3xl font-bold text-green-400">{riskDetails.likelihood_to_close}%</div>
              </div>
              
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Likelihood to Slip</div>
                <div className="text-3xl font-bold text-red-400">{riskDetails.likelihood_to_slip}%</div>
              </div>
              
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Predicted Close Date</div>
                <div className="text-lg font-bold text-white">
                  {riskDetails.predicted_close_date 
                    ? new Date(riskDetails.predicted_close_date).toLocaleDateString() 
                    : opportunity.close_date
                    ? new Date(opportunity.close_date).toLocaleDateString()
                    : 'Not set'}
                </div>
              </div>
            </div>

            {/* Recent Activity & Gong Analysis */}
            {recentCalls.length > 0 && (
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Recent Gong Calls
                </h3>
                <div className="space-y-4">
                  {recentCalls.map((call) => (
                    <div key={call.call_id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                            call.overall_sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                            call.overall_sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {call.overall_sentiment} Sentiment
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(call.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {call.recording_url && (
                          <a href={call.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">
                            View Recording
                          </a>
                        )}
                      </div>
                      
                      {call.competitor_mentions && call.competitor_mentions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-red-300 font-semibold">Competitors Mentioned:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {call.competitor_mentions.map((comp, idx) => (
                              <span key={idx} className="text-xs bg-red-500/10 text-red-300 px-2 py-0.5 rounded border border-red-500/20">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {call.topics && call.topics.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400">Topics Discussed:</p>
                          <p className="text-sm text-gray-300">{call.topics.slice(0, 3).join(', ')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {riskDetails.recommended_actions && riskDetails.recommended_actions.length > 0 && (
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Recommended Actions
                </h3>
                
                <div className="space-y-3">
                  {riskDetails.recommended_actions.map((action, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 ${getPriorityColor(action.priority)}`}>
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(action.priority)}
                        <div className="flex-1">
                          <div className="font-semibold mb-1">{action.action}</div>
                          <div className="text-sm opacity-90">{action.reason}</div>
                          <div className="text-xs mt-2 opacity-75 uppercase font-semibold">
                            {action.priority} priority
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => window.open(`mailto:${opportunity.owner_name}?subject=Re: ${opportunity.name}`)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <Mail className="w-4 h-4" />
                Email Owner
              </button>
              
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
              >
                Close
              </button>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-gray-500 text-center">
              Risk analysis updated {new Date(riskDetails.calculated_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
