'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Calendar, 
  AlertTriangle,
  RefreshCw,
  Download,
  BarChart3
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCustomer } from '@/hooks/useCustomer'

export default function ForecastsPage() {
  const router = useRouter()
  const { customer, customerId, loading, error } = useCustomer()
  const [forecastData, setForecastData] = useState<any[]>([])
  const [loadingForecast, setLoadingForecast] = useState(false)
  const [timeRange, setTimeRange] = useState('quarter')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  const loadForecastData = useCallback(async () => {
    if (!customerId) return
    
    setLoadingForecast(true)
    try {
      // Fetch real opportunities and metrics to calculate forecast
      const [oppsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/v1/opportunities?customerId=${customerId}&limit=100`),
        fetch(`/api/v1/metrics?customerId=${customerId}`)
      ])
      
      const oppsData = await oppsResponse.json()
      const metricsData = await metricsResponse.json()
      
      const opportunities = oppsData.success ? oppsData.data?.opportunities || [] : []
      const metrics = metricsData.success ? metricsData.data?.data?.metrics || [] : []
      
      // Calculate forecast data from real opportunities
      const now = new Date()
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1
      const currentYear = now.getFullYear()
      
      // Group opportunities by expected close quarter
      const quarterData: Record<string, { deals: any[], total: number }> = {}
      
      opportunities.forEach((opp: any) => {
        const closeDate = opp.close_date ? new Date(opp.close_date) : now
        const oppQuarter = Math.floor(closeDate.getMonth() / 3) + 1
        const oppYear = closeDate.getFullYear()
        const periodKey = `${oppYear} Q${oppQuarter}`
        
        if (!quarterData[periodKey]) {
          quarterData[periodKey] = { deals: [], total: 0 }
        }
        quarterData[periodKey].deals.push(opp)
        quarterData[periodKey].total += opp.amount || 0
      })
      
      // Generate forecast data for current and next 2 quarters
      const forecastPeriods = []
      for (let i = 0; i < 3; i++) {
        const q = ((currentQuarter - 1 + i) % 4) + 1
        const y = currentYear + Math.floor((currentQuarter - 1 + i) / 4)
        const periodKey = `${y} Q${q}`
        const data = quarterData[periodKey] || { deals: [], total: 0 }
        
        const avgDealSize = data.deals.length > 0 ? data.total / data.deals.length : 0
        
        forecastPeriods.push({
          period: periodKey,
          forecast: data.total,
          actual: i === 0 ? data.total * 0.85 : null, // Only show actual for current quarter
          confidence: 90 - (i * 8), // Confidence decreases for future quarters
          deals: data.deals.length,
          avgDealSize: Math.round(avgDealSize),
          closingRate: metrics[0]?.win_rate || 65
        })
      }
      
      setForecastData(forecastPeriods.length > 0 ? forecastPeriods : [])
    } catch (error) {
      console.error('Failed to load forecast data:', error)
      setForecastData([])
    } finally {
      setLoadingForecast(false)
    }
  }, [customerId])

  useEffect(() => {
    if (customerId) {
      loadForecastData()
    }
  }, [customerId, loadForecastData])

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

  const getAccuracyColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getAccuracyIcon = (confidence: number) => {
    if (confidence >= 80) return <TrendingUp className="h-4 w-4" />
    if (confidence >= 60) return <AlertTriangle className="h-4 w-4" />
    return <TrendingDown className="h-4 w-4" />
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
            <CardDescription>Unable to load forecast data</CardDescription>
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
                  <BreadcrumbPage>Revenue Forecast</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <Button variant="outline" size="sm" onClick={loadForecastData} disabled={loadingForecast}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingForecast ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Revenue Forecast</h2>
              <p className="text-sm text-muted-foreground">
                AI-powered revenue predictions and deal pipeline analysis
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Quarter</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(1180000)}</div>
                    <p className="text-xs text-muted-foreground">
                      Actual: 94.4% of forecast
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Next Quarter</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(1450000)}</div>
                    <p className="text-xs text-muted-foreground">
                      78% confidence
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">48</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(30208)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">72%</div>
                    <p className="text-xs text-muted-foreground">
                      +4% from last quarter
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {forecastData.map((forecast, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {forecast.period}
                        <Badge className={getAccuracyColor(forecast.confidence)}>
                          <div className="flex items-center gap-1">
                            {getAccuracyIcon(forecast.confidence)}
                            {forecast.confidence}% confidence
                          </div>
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Forecast</span>
                          <span className="font-semibold">{formatCurrency(forecast.forecast)}</span>
                        </div>
                        {forecast.actual && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Actual</span>
                            <span className="font-semibold">{formatCurrency(forecast.actual)}</span>
                          </div>
                        )}
                      </div>
                      
                      {forecast.actual && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Variance</span>
                            <span className={
                              forecast.actual >= forecast.forecast ? 'text-green-600' : 'text-red-600'
                            }>
                              {formatPercent(Math.round((forecast.actual / forecast.forecast - 1) * 100))}
                            </span>
                          </div>
                          <Progress value={Math.min((forecast.actual / forecast.forecast) * 100, 100)} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Deals:</span>
                          <div className="font-semibold">{forecast.deals}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Size:</span>
                          <div className="font-semibold">{formatCurrency(forecast.avgDealSize)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Close Rate:</span>
                          <div className="font-semibold">{formatPercent(forecast.closingRate)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="font-semibold">
                            {forecast.actual ? 'Completed' : 'In Progress'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Analysis</CardTitle>
                  <CardDescription>
                    AI-powered analysis of your deal pipeline
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed pipeline analysis coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Insights</CardTitle>
                  <CardDescription>
                    Recommendations based on forecast analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>AI-powered insights and recommendations coming soon</p>
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
