'use client'

import { AlertCircle, Clock, CheckCircle, X } from 'lucide-react'
import type { Insight } from '@/lib/types/database'
import { useState } from 'react'

interface InsightsPanelProps {
  insights: Insight[]
  customerId: string
  onDismiss?: (insightId: string) => void
}

export default function InsightsPanel({
  insights,
  customerId,
  onDismiss,
}: InsightsPanelProps) {
  const [dismissing, setDismissing] = useState<string | null>(null)

  const handleDismiss = async (insightId: string) => {
    setDismissing(insightId)
    try {
      const response = await fetch('/api/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, status: 'dismissed' }),
      })

      if (response.ok && onDismiss) {
        onDismiss(insightId)
      }
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    } finally {
      setDismissing(null)
    }
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          border: 'border-red-500',
          icon: AlertCircle,
          iconColor: 'text-red-400',
          bg: 'bg-red-500/10',
        }
      case 'medium':
        return {
          border: 'border-yellow-500',
          icon: Clock,
          iconColor: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
        }
      case 'positive':
        return {
          border: 'border-green-500',
          icon: CheckCircle,
          iconColor: 'text-green-400',
          bg: 'bg-green-500/10',
        }
      default:
        return {
          border: 'border-gray-500',
          icon: AlertCircle,
          iconColor: 'text-gray-400',
          bg: 'bg-gray-500/10',
        }
    }
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Insights</h2>
        <p className="text-gray-400">No active insights at this time.</p>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Active Insights</h2>
      <div className="space-y-4">
        {insights.map((insight) => {
          const styles = getSeverityStyles(insight.severity)
          const Icon = styles.icon

          return (
            <div
              key={insight.id}
              className={`${styles.border} ${styles.bg} border rounded-lg p-4 relative`}
            >
              <button
                onClick={() => handleDismiss(insight.id)}
                disabled={dismissing === insight.id}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${styles.iconColor} mt-0.5`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-300 mb-2">{insight.message}</p>
                  {insight.impact && (
                    <p className="text-xs text-gray-400 mb-1">
                      <span className="font-medium">Impact:</span> {insight.impact}
                    </p>
                  )}
                  {insight.recommended_action && (
                    <p className="text-xs text-gray-400">
                      <span className="font-medium">Recommendation:</span>{' '}
                      {insight.recommended_action}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(insight.detected_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

