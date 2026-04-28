'use client'

import { TrendingUp, Target, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '../ui/card'

interface SimplifiedMetricsProps {
  forecastAccuracy?: number
  forecastTrend?: number
  atRiskDeals?: number
  atRiskValue?: number
  nextAction?: string
}

export default function SimplifiedMetrics({
  forecastAccuracy = 87.3,
  forecastTrend = 2.3,
  atRiskDeals = 3,
  atRiskValue = 180000,
  nextAction = "Follow up with Acme Corp"
}: SimplifiedMetricsProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Forecast Accuracy */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-green-400" />
            </div>
            {forecastTrend > 0 ? (
              <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                <ArrowUp className="w-4 h-4" />
                {forecastTrend}%
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                <ArrowDown className="w-4 h-4" />
                {Math.abs(forecastTrend)}%
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Forecast Accuracy</h3>
            <p className="text-4xl font-bold text-white">{forecastAccuracy}%</p>
            <p className="text-xs text-gray-500">
              {forecastTrend > 0 ? '+' : ''}{forecastTrend}% vs last quarter
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">vs Salesforce Einstein</span>
              <span className="text-green-400 font-semibold">+22%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* At-Risk Deals */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
            {atRiskDeals > 0 && (
              <div className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
                Urgent
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">At-Risk Deals</h3>
            <p className="text-4xl font-bold text-white">{atRiskDeals}</p>
            <p className="text-xs text-gray-500">
              {formatCurrency(atRiskValue)} total value
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <button className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors">
              View all at-risk deals →
            </button>
          </div>
        </div>
      </Card>

      {/* Next Best Action */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Next Best Action</h3>
            <p className="text-lg font-semibold text-white leading-snug">
              {nextAction}
            </p>
            <p className="text-xs text-gray-500">
              AI recommendation
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <button className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium py-2 rounded-lg transition-colors">
              Take Action
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
