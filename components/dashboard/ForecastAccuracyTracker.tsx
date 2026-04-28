'use client'

import { useState } from 'react'
import { Target, TrendingUp, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockAccuracyData = [
  { week: 'Week 1', accuracy: 78, predicted: 450, actual: 430 },
  { week: 'Week 2', accuracy: 82, predicted: 520, actual: 510 },
  { week: 'Week 3', accuracy: 85, predicted: 480, actual: 475 },
  { week: 'Week 4', accuracy: 87, predicted: 560, actual: 550 },
  { week: 'Week 5', accuracy: 88, predicted: 590, actual: 585 },
  { week: 'Week 6', accuracy: 87, predicted: 610, actual: 595 },
  { week: 'This Week', accuracy: 89, predicted: 630, actual: 625 },
]

export default function ForecastAccuracyTracker() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')
  
  const currentAccuracy = mockAccuracyData[mockAccuracyData.length - 1].accuracy
  const previousAccuracy = mockAccuracyData[mockAccuracyData.length - 2].accuracy
  const trend = currentAccuracy - previousAccuracy

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-white mb-2">{payload[0].payload.week}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">Accuracy:</span>
              <span className="text-xs font-semibold text-green-400">{payload[0].value}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">Predicted:</span>
              <span className="text-xs text-white">${payload[0].payload.predicted}K</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">Actual:</span>
              <span className="text-xs text-white">${payload[0].payload.actual}K</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

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
              <p className="text-xs text-gray-400 mt-1">AI-powered predictions vs actual results</p>
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
            <p className="text-3xl font-bold text-white">{currentAccuracy}%</p>
            <div className="flex items-center gap-1 mt-1">
              {trend > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">+{trend}%</span>
                </>
              ) : (
                <span className="text-xs text-gray-500">No change</span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">vs Salesforce</p>
            <p className="text-3xl font-bold text-green-400">+22%</p>
            <p className="text-xs text-gray-500 mt-1">More accurate</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Confidence</p>
            <p className="text-3xl font-bold text-white">High</p>
            <p className="text-xs text-gray-500 mt-1">Based on 150+ deals</p>
          </div>
        </div>

        {/* Accuracy Trend Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockAccuracyData}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="week" 
                stroke="#64748b" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                tickLine={false}
                domain={[70, 100]}
                ticks={[70, 75, 80, 85, 90, 95, 100]}
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

        {/* What Drives Accuracy */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">What drives our accuracy?</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Email engagement patterns</span>
                  <span className="text-green-400 font-semibold">35%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Call frequency & duration</span>
                  <span className="text-green-400 font-semibold">28%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Deal velocity & stage progression</span>
                  <span className="text-green-400 font-semibold">22%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Stakeholder engagement</span>
                  <span className="text-green-400 font-semibold">15%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
