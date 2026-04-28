'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Database, Download, AlertTriangle, RefreshCw } from 'lucide-react'
import MetricsCards from './MetricsCards'
import InsightsPanel from './InsightsPanel'
import ChatInterface from './ChatInterface'
import EmptyState from './EmptyState'
import ErrorMessage from './ErrorMessage'
import DateRangeFilter, { getDateRangeFilter } from './DateRangeFilter'
import RiskBadge from './RiskBadge'
import DealRiskModal from './DealRiskModal'
import HighRiskDeals from './HighRiskDeals'
import AIAgentImpact from './AIAgentImpact'
import AgentActivityLog from './AgentActivityLog'
import MainLayout from './layout/MainLayout'
import CommandPalette from './CommandPalette'
import PipelineChart from './dashboard/PipelineChart'
import NaturalLanguageQuery from './dashboard/NaturalLanguageQuery'
import SimplifiedMetrics from './dashboard/SimplifiedMetrics'
import ProactiveAlerts from './dashboard/ProactiveAlerts'
import ForecastAccuracyTracker from './dashboard/ForecastAccuracyTrackerNew'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { exportToCSV } from '@/lib/utils/export'
import { authenticatedGet, authenticatedPost } from '@/lib/utils/authenticated-fetch'
import type { Metric, Opportunity, Insight } from '@/lib/types/database'
import { useCustomer } from '@/hooks/useCustomer'

interface DashboardProps {
  customerId: string
}

export default function Dashboard({ customerId }: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customer = useCustomer()
  const [metrics, setMetrics] = useState<Metric | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<Metric | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<string>('all')
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true) // Page loading state
  const [isLoading, setIsLoading] = useState(false) // API call loading state

  // Rate limiting to prevent excessive API calls
  const [lastApiCall, setLastApiCall] = useState<{ [key: string]: number }>({})
  const API_CALL_COOLDOWN = 3000 // 3 seconds cooldown (increased from 2 seconds)
  const [ongoingCalls, setOngoingCalls] = useState<Set<string>>(new Set()) // Track ongoing calls
  
  // Get active tab from URL params (default to 'query' - natural language interface)
  const tabParam = searchParams?.get('tab')
  const activeTab = (tabParam as 'query' | 'forecast' | 'deals' | 'overview') || 'query'

  // Rate limiting helper with deduplication
  const shouldMakeApiCall = (endpoint: string): boolean => {
    const now = Date.now()
    const lastCall = lastApiCall[endpoint]
    
    // Check if already in progress
    if (ongoingCalls.has(endpoint)) {
      console.log(`Call to ${endpoint} already in progress, skipping`)
      return false
    }
    
    // Check rate limit
    if (lastCall && (now - lastCall) < API_CALL_COOLDOWN) {
      console.log(`Rate limiting API call to ${endpoint}`)
      return false
    }
    
    // Mark as in progress and update time
    setOngoingCalls(prev => new Set(prev).add(endpoint))
    setLastApiCall(prev => ({ ...prev, [endpoint]: now }))
    setIsLoading(true)
    
    return true
  }

  // Enhanced API call wrapper with rate limiting, deduplication, and loading states
  const rateLimitedAuthenticatedGet = async (endpoint: string) => {
    // Remove from ongoing calls when we're done
    const cleanup = () => {
      setOngoingCalls(prev => {
        const newSet = new Set(prev)
        newSet.delete(endpoint)
        return newSet
      })
      // Check if no other calls are in progress
      if (ongoingCalls.size <= 1) {
        setIsLoading(false)
      }
    }

    if (!shouldMakeApiCall(endpoint)) {
      return { data: null, error: 'Rate limited or in progress' }
    }
    
    try {
      const response = await authenticatedGet(endpoint)
      return { data: await response.json(), error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      cleanup()
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Get customer data from shared hook
      // CRITICAL: Get customer data FIRST to ensure we have correct customerId
      const customerData = await customer.refreshCustomer()
      
      if (!customerData) {
        console.error('No customer data available, cannot load dashboard')
        setLoading(false)
        return
      }
      
      console.log('Loading dashboard data for customer:', customerData.id)
      
      // Check if customer has ANY connected integrations
      const hasIntegrations = customerData?.salesforce_connected || 
                          customerData?.hubspot_connected ||
                          customerData?.gong_connected ||
                          customerData?.outreach_connected ||
                          customerData?.salesloft_connected ||
                          customerData?.skip_onboarding || 
                          false

      if (!hasIntegrations) {
        console.log('No integrations connected, showing onboarding state')
        setLoading(false)
        return
      }

      // Load data with the correct customer ID
      const [metricsRes, oppsRes, insightsRes] = await Promise.allSettled([
        rateLimitedAuthenticatedGet(`/api/v1/metrics?customerId=${customerData.id}`),
        rateLimitedAuthenticatedGet(`/api/v1/opportunities?customerId=${customerData.id}`),
        rateLimitedAuthenticatedGet(`/api/v1/insights?customerId=${customerData.id}`)
      ])

      console.log('API responses:', {
        metrics: metricsRes.status,
        opportunities: oppsRes.status, 
        insights: insightsRes.status
      })

      // Handle metrics
      if (metricsRes.status === 'fulfilled' && metricsRes.value.data?.data?.metrics) {
        const metricsData = metricsRes.value.data.data.metrics
        if (Array.isArray(metricsData)) {
          setMetrics(metricsData[0] || null)
          setPreviousMetrics(metricsData[1] || null)
        } else {
          setMetrics(metricsData)
        }
      }

      // Handle opportunities
      if (oppsRes.status === 'fulfilled' && oppsRes.value.data?.opportunities) {
        setOpportunities(oppsRes.value.data.opportunities || [])
        console.log('Loaded', oppsRes.value.data.opportunities.length, 'opportunities')
      }

      // Handle insights
      if (insightsRes.status === 'fulfilled' && insightsRes.value.data?.insights) {
        setInsights(insightsRes.value.data.insights || [])
        console.log('Loaded', insightsRes.value.data.insights.length, 'insights')
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [customer])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    toast.info('Syncing data...')
    
    try {
      // CRITICAL: Get fresh customer data first
      const customerData = await customer.refreshCustomer()
      
      if (!customerData) {
        throw new Error('No customer data available')
      }

      console.log('Starting sync for customer:', customerData.id)
      
      const response = await authenticatedPost('/api/sync', { customerId: customerData.id })

      const data = await response.json()

      if (data.success || response.ok) {
        setLastSync(new Date().toISOString())
        
        // Reload data after successful sync
        toast.success('Data synced successfully! Loading refreshed data...')
        await new Promise(resolve => setTimeout(resolve, 2000)) // Brief pause
        
        await loadData() // Reload with fresh data
      } else {
        setSyncError(data.error || 'Sync failed. Please try again.')
        toast.error(data.error || 'Sync failed')
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      setSyncError(error.message || 'Network error. Please check your connection.')
      toast.error('Sync failed. Check your connection.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDismissInsight = (insightId: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== insightId))
  }

  const handleExport = () => {
    const filename = `opportunities_${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(filteredOpportunities, filename)
  }

  // Filter opportunities by date range
  const filteredOpportunities = opportunities.filter((opp) => {
    const dateFilter = getDateRangeFilter(dateRange)
    if (!dateFilter) return true
    
    const oppDate = opp.close_date ? new Date(opp.close_date) : new Date(opp.created_at || '')
    return oppDate >= dateFilter
  })

  // Calculate deal age helper
  const calculateDealAge = (opp: Opportunity) => {
    const createdDate = opp.created_date ? new Date(opp.created_date) : new Date(opp.created_at || '2024-01-01')
    const today = new Date()
    return Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Determine health status based on deal age and stage
  const getHealthStatus = (avgAge: number, oldestAge: number): 'healthy' | 'caution' | 'critical' => {
    if (oldestAge > 60 || avgAge > 45) return 'critical'
    if (oldestAge > 45 || avgAge > 30) return 'caution'
    return 'healthy'
  }

  // Group opportunities by stage for chart with enhanced metrics
  const stageData = filteredOpportunities.reduce((acc: any, opp) => {
    const stage = opp.stage || 'Unknown'
    const dealAge = calculateDealAge(opp)
    
    if (!acc[stage]) {
      acc[stage] = {
        amount: 0,
        deals: [],
        ages: []
      }
    }
    
    acc[stage].amount += opp.amount || 0
    acc[stage].deals.push(opp)
    acc[stage].ages.push(dealAge)
    
    return acc
  }, {})

  const chartData = Object.entries(stageData).map(([stage, data]: [string, any]) => {
    const avgAge = data.ages.length > 0 
      ? data.ages.reduce((sum: number, age: number) => sum + age, 0) / data.ages.length 
      : 0
    const oldestDeal = data.ages.length > 0 ? Math.max(...data.ages) : 0
    
    return {
      stage,
      amount: Number(data.amount) / 1000,
      count: data.deals.length,
      avgAge,
      oldestDeal,
      health: getHealthStatus(avgAge, oldestDeal)
    }
  })

  // Handle stage click to filter deals
  const handleStageClick = (stage: string) => {
    // You can implement filtering or navigation here
    console.log('Clicked stage:', stage)
    // Example: setFilteredStage(stage) or navigate to deals tab with filter
  }

  if (loading || isLoading) {
    return (
      <MainLayout
        onSync={handleSync}
        syncing={syncing}
        lastSync={lastSync}
        customer={customer}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
            <span className="text-gray-300">Loading dashboard data...</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      onSync={handleSync}
      syncing={syncing}
      lastSync={lastSync}
      customer={customer}
    >
      {/* Command Palette */}
      <CommandPalette onSync={handleSync} />

      {/* Main Content */}
      <div className="p-6">
        {/* Sync Error Message */}
        {syncError && (
          <div className="mb-6">
            <ErrorMessage
              title="Sync Failed"
              message={syncError}
              onDismiss={() => setSyncError(null)}
            />
          </div>
        )}

        {/* Ask AI Tab (Default) - Natural Language Query Interface */}
        {activeTab === 'query' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Natural Language Query - PRIMARY INTERFACE */}
            <NaturalLanguageQuery customerId={customerId} />

            {/* Simplified Key Metrics - Connected to real data */}
            <SimplifiedMetrics 
              forecastAccuracy={metrics?.[0]?.win_rate ? (metrics[0].win_rate * 100) : 87}
              forecastTrend={previousMetrics ? (metrics?.[0]?.win_rate || 87) - (previousMetrics[0]?.win_rate || 87) : 0}
              atRiskDeals={opportunities.filter(o => (o.risk_score || 0) > 60).length}
              atRiskValue={opportunities.filter(o => (o.risk_score || 0) > 60).reduce((sum, o) => sum + (o.amount || 0), 0)}
              nextAction={insights[0]?.recommendation || insights[0]?.title || "Connect your CRM to get AI recommendations"}
            />

            {/* Proactive Alerts - Connected to real insights */}
            <ProactiveAlerts insights={insights} />

            {/* High-Risk Deals Quick View */}
            <HighRiskDeals opportunities={opportunities} onViewDetails={setSelectedDealId} />
          </motion.div>
        )}

        {/* Forecast Accuracy Tab */}
        {activeTab === 'forecast' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ForecastAccuracyTracker />
            
            {/* Historical Forecast vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle>Forecast vs Actual (Last 6 Months)</CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Compare AI predictions to actual closed deals
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-400 py-12">
                  Historical comparison chart coming soon
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Deal Risk Scoring Tab */}
        {activeTab === 'deals' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Date Range Filter */}
            <div className="flex justify-end">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>

            {/* High-Risk Deals Section */}
            <HighRiskDeals opportunities={opportunities} onViewDetails={setSelectedDealId} />

            {/* Pipeline Chart */}
            <PipelineChart 
              data={chartData} 
              onSync={handleSync}
              onStageClick={handleStageClick}
            />

            {/* Opportunities Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Deals with Risk Scores</CardTitle>
                    <p className="text-sm text-gray-400 mt-1">
                      Showing {filteredOpportunities.length} of {opportunities.length} opportunities
                    </p>
                  </div>
                  {filteredOpportunities.length > 0 && (
                    <Button onClick={handleExport} variant="secondary" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredOpportunities.length === 0 ? (
                  <EmptyState
                    icon={Database}
                    title="No opportunities found"
                    description="Connect your CRM or adjust the date range filter"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left p-3 text-sm font-semibold text-gray-400">Deal</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-400">Risk Score</th>
                          <th className="text-right p-3 text-sm font-semibold text-gray-400">Amount</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-400">Stage</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-400">Close Date</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-400">AI Signal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOpportunities.map((opp) => (
                          <tr
                            key={opp.id}
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() => setSelectedDealId(opp.id)}
                          >
                            <td className="p-3">
                              <div className="font-medium text-white">{opp.name}</div>
                              <div className="text-xs text-gray-400">{opp.account_name || 'No account'}</div>
                            </td>
                            <td className="p-3">
                              <RiskBadge riskScore={opp.risk_score ?? null} riskLevel={opp.risk_level ?? null} size="sm" />
                            </td>
                            <td className="p-3 text-right font-medium text-white">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                              }).format(opp.amount || 0)}
                            </td>
                            <td className="p-3 text-gray-300">{opp.stage || 'Unknown'}</td>
                            <td className="p-3 text-gray-300">
                              {opp.close_date
                                ? new Date(opp.close_date).toLocaleDateString()
                                : 'Not set'}
                            </td>
                            <td className="p-3">
                              <span className="text-xs text-gray-400">
                                {opp.risk_score && opp.risk_score > 70 
                                  ? '🔴 No activity 14d' 
                                  : opp.risk_score && opp.risk_score > 40 
                                  ? '🟡 Slow progression'
                                  : '🟢 On track'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Overview Tab (Traditional Dashboard) */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Metrics Cards */}
            <MetricsCards metrics={metrics} previousMetrics={previousMetrics} />

            {/* AI Agent Impact */}
            <AIAgentImpact customerId={customerId} />

            {/* High-Risk Deals Section */}
            <HighRiskDeals opportunities={opportunities} onViewDetails={setSelectedDealId} />

            {/* Grid: Pipeline Chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pipeline Chart */}
              <div className="lg:col-span-2">
                <PipelineChart 
                  data={chartData} 
                  onSync={handleSync}
                  onStageClick={handleStageClick}
                />
              </div>

              {/* Insights Panel */}
              <div>
                <InsightsPanel
                  insights={insights}
                  customerId={customerId}
                  onDismiss={handleDismissInsight}
                />
              </div>
            </div>
          </motion.div>
        )}


      </div>

      {/* Deal Risk Modal (Global) */}
      {selectedDealId && (
        <DealRiskModal
          opportunityId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
        />
      )}
    </MainLayout>
  )
}
