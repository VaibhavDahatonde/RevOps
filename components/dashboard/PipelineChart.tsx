'use client'

import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { TrendingUp, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import EmptyState from '../EmptyState'

interface StageData {
  stage: string
  amount: number
  count: number
  avgAge?: number
  oldestDeal?: number
  health?: 'healthy' | 'caution' | 'critical'
}

interface PipelineChartProps {
  data: StageData[]
  onSync: () => void
  onStageClick?: (stage: string) => void
}

// Color palette for different stages
const STAGE_COLORS = [
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#C026D3', // Purple-600
]

export default function PipelineChart({ data, onSync, onStageClick }: PipelineChartProps) {
  // Sort data by amount (highest first) for better visualization
  const sortedData = [...data].sort((a, b) => b.amount - a.amount)

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  }

  // Health indicator helper
  const getHealthIndicator = (health?: string) => {
    switch (health) {
      case 'healthy':
        return { 
          label: 'Healthy', 
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20'
        }
      case 'caution':
        return { 
          label: 'Caution', 
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20'
        }
      case 'critical':
        return { 
          label: 'Critical', 
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        }
      default:
        return { 
          label: 'Unknown', 
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20'
        }
    }
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const stageData = payload[0].payload
      const healthInfo = getHealthIndicator(stageData.health)
      
      return (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl p-4 shadow-2xl min-w-[220px]">
          {/* Header with stage name and health badge */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">
              {stageData.stage}
            </p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${healthInfo.bg} ${healthInfo.border} ${healthInfo.color} border`}>
              {healthInfo.label}
            </span>
          </div>
          
          {/* Main amount - large and prominent */}
          <div className="mb-3">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ${(payload[0].value * 1000).toLocaleString()}
            </p>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-xs text-gray-400">Deals</p>
              <p className="text-lg font-bold text-white">{stageData.count || 0}</p>
            </div>
            {stageData.avgAge && (
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-xs text-gray-400">Avg Age</p>
                <p className="text-lg font-bold text-white">{Math.round(stageData.avgAge)}d</p>
              </div>
            )}
          </div>
          
          {/* Oldest deal warning if needed */}
          {stageData.oldestDeal !== undefined && stageData.oldestDeal > 45 && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 mb-2">
              <Clock className="w-3 h-3 text-orange-400" />
              <p className="text-xs text-orange-400">
                Oldest deal: <span className="font-semibold">{Math.round(stageData.oldestDeal)} days</span>
              </p>
            </div>
          )}
          
          {/* Click hint */}
          {onStageClick && (
            <div className="flex items-center gap-1 text-purple-400 text-xs font-medium pt-2 border-t border-white/10">
              <ArrowRight className="w-3 h-3" />
              <span>Click to view deals</span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
          <CardDescription>
            Visualize your deals across pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <EmptyState
              icon={TrendingUp}
              title="No Pipeline Data"
              description="Connect your CRM and sync data to see your pipeline visualization."
              action={{
                label: 'Sync Now',
                onClick: onSync,
              }}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
          <CardDescription>
            Total pipeline value across {data.length} stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={sortedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <defs>
                {STAGE_COLORS.map((color, index) => (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`barGradient-${index}`}
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255, 255, 255, 0.05)" 
                vertical={false}
                horizontal={true}
              />

              <XAxis
                dataKey="stage"
                stroke="#6B7280"
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />

              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value}K`}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }} />

              <Bar
                dataKey="amount"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                animationEasing="ease-out"
                onClick={(data) => onStageClick && onStageClick(data.stage)}
                cursor={onStageClick ? 'pointer' : 'default'}
                maxBarSize={100}
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#barGradient-${index % STAGE_COLORS.length})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary Stats - Match MetricsCards style */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Value */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl"></div>
              <p className="text-xs text-gray-400 mb-1">Total Value</p>
              <p className="text-xl font-bold text-white relative z-10">
                ${(data.reduce((sum, item) => sum + item.amount, 0) * 1000).toLocaleString()}
              </p>
            </div>

            {/* Total Deals */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl"></div>
              <p className="text-xs text-gray-400 mb-1">Total Deals</p>
              <p className="text-xl font-bold text-white relative z-10">
                {data.reduce((sum, item) => sum + (item.count || 0), 0)}
              </p>
            </div>

            {/* Stages */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl"></div>
              <p className="text-xs text-gray-400 mb-1">Active Stages</p>
              <p className="text-xl font-bold text-white relative z-10">{data.length}</p>
            </div>

            {/* Health Status */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-2xl"></div>
              <p className="text-xs text-gray-400 mb-1">Pipeline Health</p>
              <div className="flex items-center gap-2 relative z-10">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-white font-semibold">{data.filter(d => d.health === 'healthy').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-white font-semibold">{data.filter(d => d.health === 'caution').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-white font-semibold">{data.filter(d => d.health === 'critical').length}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Critical Alert - Redesigned */}
          {data.some(d => d.health === 'critical') && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 relative overflow-hidden bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl"></div>
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400 mb-1">Critical Stages Detected</p>
                  <p className="text-xs text-gray-300">
                    <span className="font-semibold">
                      {data.filter(d => d.health === 'critical').map(d => d.stage).join(', ')}
                    </span>
                    {' '}
                    {data.filter(d => d.health === 'critical').length === 1 ? 'has' : 'have'} deals requiring immediate attention
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
