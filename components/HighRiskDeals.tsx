'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import RiskBadge from './RiskBadge'
import type { Opportunity } from '@/lib/types/database'

interface HighRiskDealsProps {
  opportunities: Opportunity[]
  onViewDetails: (dealId: string) => void
}

export default function HighRiskDeals({ opportunities, onViewDetails }: HighRiskDealsProps) {
  const highRiskDeals = opportunities
    .filter(opp => opp.risk_score && opp.risk_score >= 61)
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 5)

  if (highRiskDeals.length === 0) {
    return null
  }

  const totalAtRisk = highRiskDeals.reduce((sum, opp) => sum + (opp.amount || 0), 0)

  return (
    <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 backdrop-blur-lg border border-red-500/30 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">High-Risk Deals</h2>
            <p className="text-sm text-red-200">
              {highRiskDeals.length} deal{highRiskDeals.length !== 1 ? 's' : ''} need immediate attention • ${(totalAtRisk / 1000000).toFixed(2)}M at risk
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {highRiskDeals.map((deal) => (
          <div
            key={deal.id}
            onClick={() => onViewDetails(deal.id)}
            className="bg-white/5 hover:bg-white/10 border border-red-500/20 hover:border-red-500/40 rounded-lg p-4 cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <RiskBadge riskScore={deal.risk_score ?? null} riskLevel={deal.risk_level} size="sm" showScore={true} />
                  <h4 className="text-white font-semibold group-hover:text-purple-300 transition-colors">
                    {deal.name}
                  </h4>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="font-semibold text-red-300">${((deal.amount || 0) / 1000).toFixed(0)}K</span>
                  <span>•</span>
                  <span>{deal.stage || 'No stage'}</span>
                  {deal.days_since_update && (
                    <>
                      <span>•</span>
                      <span className="text-red-300">No activity {deal.days_since_update} days</span>
                    </>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
