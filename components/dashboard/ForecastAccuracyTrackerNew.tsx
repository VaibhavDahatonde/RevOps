'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { TrendingUp, TrendingDown, Target, Award, Loader2, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface AccuracyData {
  currentAccuracy: number
  previousAccuracy: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  totalDeals: number
  accurateForecasts: number
  monthlyData: Array<{
    month: string
    accuracy: number
    deals: number
  }>
  drivers: Array<{
    name: string
    impact: number
  }>
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold">{payload[0].value}% accurate</p>
        <p className="text-gray-400 text-xs">{payload[0].payload.deals} deals</p>
      </div>
    )
  }
  return null
}

export default function ForecastAccuracyTracker() {
  const [data, setData] = useState<AccuracyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('quarter')

  useEffect(() => {
    fetchAccuracyData()
  }, [timeRange])

  const fetchAccuracyData = async () => {
    setLoading(true)
    try {
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90
      const response = await fetch(`/api/forecast-accuracy?days=${days}`)
      if (response.ok) {
        const accuracyData = await response.json()
        setData(accuracyData)
      }
    } catch (error) {
      console.error('Error fetching forecast accuracy:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800/30 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.totalDeals === 0) {
    return (
      <Card className="bg-slate-800/30 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white">Forecast Accuracy Tracker</CardTitle>
              <p className="text-xs text-gray-400 mt-1">AI-powered predictions vs actual results</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-gray-400 mb-2">No closed deals yet</p>
            <p className="text-sm text-gray-500">
              Sync your CRM and close deals to see forecast accuracy
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const vsEinstein = Math.max(0, data.currentAccuracy - 65) // Einstein baseline ~65%
  const trend = data.currentAccuracy - data.previousAccuracy

  return (
    <Card className="bg-slate-800/30 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white">Forecast Accuracy Tracker</CardTitle>
              <p className="text-xs text-gray-400 mt-1">
                Based on {data.totalDeals} closed deals
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Current Accuracy Display */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Current Accuracy</p>
            <p className="text-3xl font-bold text-white">{data.currentAccuracy}%</p>
            <div className="flex items-center gap-1 mt-1">
              {trend > 2 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">+{trend.toFixed(1)}%</span>
                </>
              ) : trend < -2 ? (
                <>
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400">{trend.toFixed(1)}%</span>
                </>
              ) : (
                <span className="text-xs text-gray-500">Stable</span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">vs Einstein</p>
            <p className="text-3xl font-bold text-green-400">+{vsEinstein.toFixed(0)}%</p>
            <p className="text-xs text-gray-500 mt-1">More accurate</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Confidence</p>
            <p className="text-3xl font-bold text-white">
              {data.totalDeals >= 50 ? 'High' : data.totalDeals >= 20 ? 'Medium' : 'Low'}
            </p>
            <p className="text-xs text-gray-500 mt-1">{data.accurateForecasts}/{data.totalDeals} accurate</p>
          </div>
        </div>

        {/* Accuracy Trend Chart */}
        {data.monthlyData.length > 0 && (
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#accuracyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* What Drives Accuracy */}
        <div className="pt-6 border-t border-slate-700">
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="w-full">
              <h4 className="text-sm font-semibold text-white mb-3">What drives our accuracy?</h4>
              <div className="space-y-2">
                {data.drivers.map((driver, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{driver.name}</span>
                    <span className="text-green-400 font-semibold">{driver.impact}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * Patterns analyzed from {data.totalDeals} closed deals
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
