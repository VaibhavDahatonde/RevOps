'use client'

import { DollarSign, Target, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import type { Metric } from '@/lib/types/database'

interface MetricsCardsProps {
  metrics: Metric | null
  previousMetrics: Metric | null
}

export default function MetricsCards({ metrics, previousMetrics }: MetricsCardsProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 animate-pulse"
          >
            <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
            <div className="h-8 bg-white/20 rounded w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    }
    return `$${(value / 1000).toFixed(0)}K`
  }

  const getTrend = (current: number, previous?: number | null) => {
    if (!previous) return null
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0,
    }
  }

  const pipelineTrend = getTrend(metrics.total_pipeline, previousMetrics?.total_pipeline)
  const winRateTrend = getTrend(metrics.win_rate, previousMetrics?.win_rate)
  const cycleTimeTrend = getTrend(metrics.avg_cycle_time, previousMetrics?.avg_cycle_time)
  const velocityTrend = getTrend(metrics.velocity, previousMetrics?.velocity)

  const cards = [
    {
      title: 'Total Pipeline',
      value: formatCurrency(metrics.total_pipeline),
      icon: DollarSign,
      trend: pipelineTrend,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10',
    },
    {
      title: 'Win Rate',
      value: `${metrics.win_rate.toFixed(1)}%`,
      icon: Target,
      trend: winRateTrend,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
    },
    {
      title: 'Avg Cycle Time',
      value: `${metrics.avg_cycle_time} days`,
      icon: Clock,
      trend: cycleTimeTrend,
      invertTrend: true,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/10 to-red-500/10',
    },
    {
      title: 'Monthly Velocity',
      value: formatCurrency(metrics.velocity),
      icon: TrendingUp,
      trend: velocityTrend,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        const TrendIcon = card.trend?.isPositive
          ? card.invertTrend
            ? TrendingDown
            : TrendingUp
          : card.invertTrend
          ? TrendingUp
          : TrendingDown
        const trendColor = card.trend?.isPositive
          ? card.invertTrend
            ? 'text-red-400'
            : 'text-green-400'
          : card.invertTrend
          ? 'text-green-400'
          : 'text-red-400'

        return (
          <div
            key={card.title}
            className="group relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            {/* Background gradient effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-300">{card.title}</p>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-bold text-white tracking-tight">{card.value}</h3>
                {card.trend && (
                  <div className={`flex items-center gap-1 ${trendColor} bg-black/20 px-2 py-1 rounded-lg`}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{card.trend.value}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

