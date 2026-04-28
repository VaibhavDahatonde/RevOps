'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, TrendingDown, Clock, X, ArrowRight } from 'lucide-react'
import { Card } from '../ui/card'
import type { Insight } from '@/lib/types/database'

interface Alert {
  id: string
  type: 'warning' | 'critical' | 'info'
  title: string
  description: string
  action?: string
  actionLink?: string
  timestamp: Date
}

interface ProactiveAlertsProps {
  insights?: Insight[]
}

// Convert insights to alerts format
function insightsToAlerts(insights: any[]): Alert[] {
  return insights.map(insight => ({
    id: insight.id,
    type: insight.severity === 'HIGH' || insight.severity === 'CRITICAL' ? 'critical' : 
         insight.severity === 'MEDIUM' ? 'warning' : 'info',
    title: insight.title,
    description: insight.description || insight.message || 'No description available',
    action: insight.recommendation || insight.recommended_action || 'View Details',
    timestamp: new Date(insight.created_at || insight.detected_at || new Date())
  }))
}

// Fallback mock alerts when no real data
const fallbackAlerts: Alert[] = [
  {
    id: 'fallback-1',
    type: 'info',
    title: 'Connect your CRM to see real alerts',
    description: 'Link Salesforce or HubSpot to enable AI-powered pipeline monitoring.',
    action: 'Connect CRM',
    timestamp: new Date()
  }
]

export default function ProactiveAlerts({ insights = [] }: ProactiveAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  
  useEffect(() => {
    if (insights && insights.length > 0) {
      setAlerts(insightsToAlerts(insights))
    } else {
      setAlerts(fallbackAlerts)
    }
  }, [insights])

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <TrendingDown className="w-5 h-5 text-orange-400" />
      case 'info':
        return <Clock className="w-5 h-5 text-blue-400" />
    }
  }

  const getAlertBorderColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-red-500/30'
      case 'warning':
        return 'border-orange-500/30'
      case 'info':
        return 'border-blue-500/30'
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }

  if (alerts.length === 0) {
    return (
      <Card className="bg-slate-800/30 border-slate-700">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">All Clear!</h3>
          <p className="text-gray-400 text-sm">
            No critical issues detected. AI is monitoring your pipeline 24/7.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Proactive Alerts</h3>
              <p className="text-xs text-gray-400">AI monitoring your pipeline 24/7</p>
            </div>
          </div>
          <span className="text-xs text-gray-500">{alerts.length} active</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-slate-800/50 border ${getAlertBorderColor(alert.type)} rounded-lg p-4 group hover:border-opacity-50 transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1">{alert.title}</h4>
                    <p className="text-xs text-gray-400 mb-2">{alert.description}</p>
                    
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                      
                      <div className="flex items-center gap-2">
                        {alert.action && (
                          <button className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors">
                            {alert.action}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  )
}
