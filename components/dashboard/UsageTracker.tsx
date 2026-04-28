'use client'

import { useEffect, useState } from 'react'
import { Database, Zap, Users, Link as LinkIcon, Bot, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface UsageMetric {
  metric: string
  current: number
  limit: number
  percentage: number
  exceeded: boolean
  unlimited: boolean
}

interface UsageData {
  planTier: string
  planName: string
  periodEnd: string
  usage: UsageMetric[]
}

export default function UsageTracker() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/subscription/usage')
      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      } else if (response.status === 404) {
        // Try to migrate subscription first
        console.log('Usage not found, attempting migration...')
        await fetch('/api/subscription/migrate', { method: 'POST' })
        // Retry after migration
        const retryResponse = await fetch('/api/subscription/usage')
        if (retryResponse.ok) {
          const data = await retryResponse.json()
          setUsageData(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!usageData) {
    return null
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'records': return Database
      case 'aiActions': return Zap
      case 'users': return Users
      case 'crmConnections': return LinkIcon
      case 'agentRuns': return Bot
      default: return TrendingUp
    }
  }

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'records': return 'Records'
      case 'aiActions': return 'AI Actions'
      case 'users': return 'Users'
      case 'crmConnections': return 'CRM Connections'
      case 'agentRuns': return 'Agent Runs'
      default: return metric
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getProgressColor = (percentage: number, exceeded: boolean) => {
    if (exceeded) return 'bg-red-500'
    if (percentage >= 90) return 'bg-amber-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Usage This Month</h3>
        <Link 
          href="/pricing"
          className="text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          Upgrade Plan
        </Link>
      </div>

      <div className="space-y-5">
        {usageData.usage.map((metric) => {
          const Icon = getMetricIcon(metric.metric)
          const progressColor = getProgressColor(metric.percentage, metric.exceeded)

          return (
            <div key={metric.metric}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {getMetricLabel(metric.metric)}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {metric.unlimited ? (
                    <span className="text-green-600 font-medium">Unlimited</span>
                  ) : (
                    <>
                      {formatNumber(metric.current)} / {formatNumber(metric.limit)}
                    </>
                  )}
                </span>
              </div>

              {!metric.unlimited && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                    />
                  </div>

                  {metric.exceeded && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Limit exceeded - Upgrade to continue
                    </p>
                  )}

                  {!metric.exceeded && metric.percentage >= 80 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {metric.percentage >= 90 ? 'Almost at limit' : 'Approaching limit'}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Billing period resets:</span>
          <span className="font-medium text-gray-900">
            {new Date(usageData.periodEnd).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
