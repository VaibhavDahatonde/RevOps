'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  Target,
  Calendar,
  RefreshCw
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCustomer } from '@/hooks/useCustomer'

export default function AnalyticsPage() {
  const router = useRouter()
  const { customer, customerId, loading, error } = useCustomer()
  const [analyticsData, setAnalyticsData] = useState<any>({})
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const loadAnalyticsData = useCallback(async () => {
    if (!customerId) return
    
    setLoadingAnalytics(true)
    try {
      // Fetch real data from APIs
      const [oppsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/v1/opportunities?customerId=${customerId}&limit=200`),
        fetch(`/api/v1/metrics?customerId=${customerId}`)
      ])
      
      const oppsData = await oppsResponse.json()
      const metricsData = await metricsResponse.json()
      
      const opportunities = oppsData.success ? oppsData.data?.opportunities || [] : []
      const metrics = metricsData.success ? metricsData.data?.data?.metrics?.[0] || {} : {}
      
      // Calculate analytics from real data
      const totalRevenue = opportunities.reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)
      const dealCount = opportunities.length
      const avgDealSize = dealCount > 0 ? totalRevenue / dealCount : 0
      
      // Group by owner to find top performers
      const ownerStats: Record<string, { name: string; revenue: number; deals: number }> = {}
      opportunities.forEach((opp: any) => {
        const ownerName = opp.owner_name || 'Unknown'
        if (!ownerStats[ownerName]) {
          ownerStats[ownerName] = { name: ownerName, revenue: 0, deals: 0 }
        }
        ownerStats[ownerName].revenue += opp.amount || 0
        ownerStats[ownerName].deals++
      })
      
      const topPerformers = Object.values(ownerStats)
        .map(owner => ({
          ...owner,
          rate: owner.deals > 0 ? Math.round((owner.revenue / totalRevenue) * 100 * 10) / 10 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4)
      
      const analyticsResult = {
        performance: {
          totalRevenue,
          revenueGrowth: metrics.win_rate || 0,
          dealCount,
          conversionRate: metrics.win_rate || 0,
          avgDealSize: Math.round(avgDealSize),
          salesCycleDays: metrics.avg_cycle_time || 0
        },
        trends: {
          revenueGrowth: [],
          dealGrowth: [],
          months: []
        },
        topPerformers
      }
      
      setAnalyticsData(analyticsResult)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
      setAnalyticsData({})
    } finally {
      setLoadingAnalytics(false)
    }
  }, [customerId])

  useEffect(() => {
    if (customerId) {
      loadAnalyticsData()
    }
  }, [customerId, loadAnalyticsData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>Unable to load analytics data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar user={{
        email: customer.email,
        name: customer.name,
      }} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <Button variant="outline" size="sm" onClick={loadAnalyticsData} disabled={loadingAnalytics}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingAnalytics ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                Track your sales performance and key metrics
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analyticsData.performance?.totalRevenue || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  +{analyticsData.performance?.revenueGrowth || 0}% from last year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.performance?.dealCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.performance?.conversionRate || 0}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analyticsData.performance?.avgDealSize || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.performance?.salesCycleDays || 0} day sales cycle
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Quarter</CardTitle>
                    <CardDescription>
                      Quarterly revenue breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Detailed revenue charts coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deal Conversion Funnel</CardTitle>
                    <CardDescription>
                      Conversion rates by stage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Conversion funnel analysis coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>
                    Monthly revenue overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed revenue trend analysis coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>
                    Individual team performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topPerformers?.map((performer: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                            {performer.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium">{performer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {performer.deals} deals • {performer.rate}% rate
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(performer.revenue)}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(Math.round(performer.revenue / performer.deals))}/deal
                          </div>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
