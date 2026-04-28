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
  Sparkles, 
  AlertTriangle, 
  TrendingDown,
  Target,
  DollarSign,
  Users,
  Clock,
  RefreshCw,
  CheckCircle,
  Lightbulb
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCustomer } from '@/hooks/useCustomer'

export default function InsightsPage() {
  const router = useRouter()
  const { customer, customerId, loading, error } = useCustomer()
  const [insightsData, setInsightsData] = useState<any[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)

  const loadInsightsData = useCallback(async () => {
    if (!customerId) return
    
    setLoadingInsights(true)
    try {
      // Fetch real insights from API
      const response = await fetch(`/api/v1/insights?customerId=${customerId}&limit=50`)
      const data = await response.json()
      
      if (data.success && data.data?.insights) {
        const insights = data.data.insights.map((insight: any) => ({
          id: insight.id,
          type: mapInsightType(insight.type || insight.severity),
          title: insight.title || 'AI Insight',
          description: insight.message || insight.description || '',
          impact: mapImpact(insight.severity),
          action: insight.recommended_action || 'Review and take action',
          dealId: insight.entity_id,
          confidence: insight.confidence || 85
        }))
        setInsightsData(insights)
      } else {
        // No data - show empty state
        setInsightsData([])
      }
    } catch (error) {
      console.error('Failed to load insights data:', error)
      setInsightsData([])
    } finally {
      setLoadingInsights(false)
    }
  }, [customerId])
  
  // Helper to map insight types
  const mapInsightType = (type: string) => {
    const typeMap: Record<string, string> = {
      'alert': 'warning',
      'high': 'risk',
      'critical': 'risk',
      'medium': 'warning',
      'low': 'opportunity',
      'positive': 'success',
      'opportunity': 'opportunity',
      'insight': 'opportunity'
    }
    return typeMap[type?.toLowerCase()] || 'opportunity'
  }
  
  // Helper to map impact levels
  const mapImpact = (severity: string) => {
    const impactMap: Record<string, string> = {
      'high': 'high',
      'critical': 'high',
      'medium': 'medium',
      'low': 'low',
      'positive': 'positive'
    }
    return impactMap[severity?.toLowerCase()] || 'medium'
  }

  useEffect(() => {
    if (customerId) {
      loadInsightsData()
    }
  }, [customerId, loadInsightsData])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="h-4 w-4" />
      case 'risk': return <AlertTriangle className="h-4 w-4" />
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <TrendingDown className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800'
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-800'
      case 'positive': return 'border-green-200 bg-green-50 text-green-800'
      default: return 'border-gray-200 bg-gray-50 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-blue-100 text-blue-800'
      case 'risk': return 'bg-red-100 text-red-800'
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
            <CardDescription>Unable to load insights data</CardDescription>
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
                  <BreadcrumbPage>AI Insights</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <Button variant="outline" size="sm" onClick={loadInsightsData} disabled={loadingInsights}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingInsights ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">AI Insights</h2>
              <p className="text-sm text-muted-foreground">
                Actionable insights powered by artificial intelligence
              </p>
            </div>
          </div>

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Insights</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="success">Success</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid gap-4">
                {insightsData.map((insight) => (
                  <Card key={insight.id} className={`border-l-4 ${getInsightColor(insight.impact)}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-background">
                            {getInsightIcon(insight.type)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{insight.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {insight.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getTypeColor(insight.type)}>
                            {insight.type}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {insight.confidence}% confidence
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="font-medium">Recommended Action:</div>
                            <div className="text-sm text-muted-foreground">{insight.action}</div>
                          </div>
                          <Button size="sm">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="grid gap-4">
                {insightsData.filter(i => i.type === 'opportunity').map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        <CardTitle>{insight.title}</CardTitle>
                      </div>
                      <CardDescription>{insight.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">Action:</div>
                          <div className="text-sm text-muted-foreground">{insight.action}</div>
                        </div>
                        <Button size="sm" className="ml-auto">
                          Pursue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <div className="grid gap-4">
                {insightsData.filter(i => i.type === 'risk' || i.type === 'warning').map((insight) => (
                  <Card key={insight.id} className={`border-l-4 ${
                    insight.type === 'risk' ? 'border-l-red-500' : 'border-l-orange-500'
                  }`}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        {insight.type === 'risk' ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-orange-600" />
                        )}
                        <CardTitle>{insight.title}</CardTitle>
                      </div>
                      <CardDescription>{insight.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">Mitigation:</div>
                          <div className="text-sm text-muted-foreground">{insight.action}</div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-auto">
                          Address
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="success" className="space-y-4">
              <div className="grid gap-4">
                {insightsData.filter(i => i.type === 'success').map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <CardTitle>{insight.title}</CardTitle>
                      </div>
                      <CardDescription>{insight.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">Next Step:</div>
                          <div className="text-sm text-muted-foreground">{insight.action}</div>
                        </div>
                        <Button size="sm" className="ml-auto">
                          Celebrate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
