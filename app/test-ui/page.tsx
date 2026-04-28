'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import MetricsCards from '@/components/MetricsCards'
import NaturalLanguageQuery from '@/components/dashboard/NaturalLanguageQuery'
import SimplifiedMetrics from '@/components/dashboard/SimplifiedMetrics'
import ProactiveAlerts from '@/components/dashboard/ProactiveAlerts'
import HighRiskDeals from '@/components/HighRiskDeals'
import DashboardLoader from '@/components/DashboardLoader'

export default function TestPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Test API endpoints
      const [metricsRes, oppsRes, insightsRes] = await Promise.all([
        fetch('/api/v1/metrics?customerId=test-customer-id'),
        fetch('/api/v1/opportunities?customerId=test-customer-id'),
        fetch('/api/v1/insights?customerId=test-customer-id')
      ])

      const [metrics, opps, insights] = await Promise.all([
        metricsRes.json(),
        oppsRes.json(), 
        insightsRes.json()
      ])

      setData({
        metrics: metrics.data?.metrics || [],
        opportunities: opps.opportunities || [],
        insights: insights.insights || []
      })
      
      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleQuery = async (question: string) => {
    try {
      const response = await fetch('/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, customerId: 'test-customer-id' })
      })
      const result = await response.json()
      return result
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading test data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white mb-8">Frontend Test Page</h1>
        
        {/* Data Summary */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">API Data Status</h2>
          <div className="grid grid-cols-3 gap-4 text-white">
            <div>
              <h3 className="text-sm text-gray-400">Metrics</h3>
              <p className="text-xl font-bold">{data.metrics.length} items</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400">Opportunities</h3>
              <p className="text-xl font-bold">{data.opportunities.length} deals</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-400">Insights</h3>
              <p className="text-xl font-bold">{data.insights.length} alerts</p>
            </div>
          </div>
        </Card>

        {/* Natural Language Query Test */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Natural Language Query</h2>
          <NaturalLanguageQuery customerId="test-customer-id" />
        </div>

        {/* Metrics Test */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Simplified Metrics</h2>
          <SimplifiedMetrics 
            forecastAccuracy={data.metrics[0]?.win_rate ? (data.metrics[0].win_rate * 100) : 87}
            forecastTrend={2.3}
            atRiskDeals={data.opportunities.filter((o: any) => (o.risk_score || 0) > 60).length}
            atRiskValue={data.opportunities.filter((o: any) => (o.risk_score || 0) > 60).reduce((sum: number, o: any) => sum + (o.amount || 0), 0)}
            nextAction={data.insights[0]?.recommendation || "Test next action"}
          />
        </div>

        {/* Alerts Test */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Proactive Alerts</h2>
          <ProactiveAlerts insights={data.insights} />
        </div>

        {/* High Risk Deals Test */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">High Risk Deals</h2>
          <HighRiskDeals 
            opportunities={data.opportunities}
            onViewDetails={(dealId: string) => alert(`Opening deal: ${dealId}`)}
          />
        </div>
      </div>
    </div>
  )
}
