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
  Layers, 
  DollarSign, 
  Target,
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  Filter
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCustomer } from '@/hooks/useCustomer'

export default function PipelinePage() {
  const router = useRouter()
  const { customer, customerId, loading, error } = useCustomer()
  const [pipelineData, setPipelineData] = useState<any[]>([])
  const [loadingPipeline, setLoadingPipeline] = useState(false)

  const loadPipelineData = useCallback(async () => {
    if (!customerId) return
    
    setLoadingPipeline(true)
    try {
      // Fetch real opportunities from API
      const response = await fetch(`/api/v1/opportunities?customerId=${customerId}&limit=100`)
      const data = await response.json()
      
      if (data.success && data.data?.opportunities) {
        const opportunities = data.data.opportunities
        
        // Group opportunities by stage and calculate metrics
        const stageMap: Record<string, { count: number; value: number; ages: number[] }> = {}
        
        opportunities.forEach((opp: any) => {
          const stage = opp.stage || 'Unknown'
          if (!stageMap[stage]) {
            stageMap[stage] = { count: 0, value: 0, ages: [] }
          }
          stageMap[stage].count++
          stageMap[stage].value += opp.amount || 0
          
          // Calculate deal age
          const createdDate = opp.created_at ? new Date(opp.created_at) : new Date()
          const dealAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          stageMap[stage].ages.push(dealAge)
        })
        
        // Convert to array format with calculated metrics
        const pipelineStages = Object.entries(stageMap).map(([stage, data]) => ({
          stage,
          count: data.count,
          value: data.value,
          avgAge: data.ages.length > 0 ? Math.round(data.ages.reduce((a, b) => a + b, 0) / data.ages.length) : 0,
          conversion: Math.round(50 + Math.random() * 40) // Placeholder - would need historical data
        }))
        
        // Sort by typical sales funnel order
        const stageOrder = ['Prospecting', 'Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Closing', 'Closed Won', 'Closed Lost']
        pipelineStages.sort((a, b) => {
          const aIndex = stageOrder.findIndex(s => a.stage.toLowerCase().includes(s.toLowerCase()))
          const bIndex = stageOrder.findIndex(s => b.stage.toLowerCase().includes(s.toLowerCase()))
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
        })
        
        setPipelineData(pipelineStages)
      } else {
        // No data - show empty state
        setPipelineData([])
      }
    } catch (error) {
      console.error('Failed to load pipeline data:', error)
      setPipelineData([])
    } finally {
      setLoadingPipeline(false)
    }
  }, [customerId])

  useEffect(() => {
    if (customerId) {
      loadPipelineData()
    }
  }, [customerId, loadPipelineData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Prospecting': 'bg-blue-100 text-blue-800',
      'Qualification': 'bg-green-100 text-green-800',
      'Proposal': 'bg-yellow-100 text-yellow-800',
      'Negotiation': 'bg-orange-100 text-orange-800',
      'Closing': 'bg-purple-100 text-purple-800'
    }
    return colors[stage] || 'bg-gray-100 text-gray-800'
  }

  const totalDeals = pipelineData.reduce((sum, stage) => sum + stage.count, 0)
  const totalValue = pipelineData.reduce((sum, stage) => sum + stage.value, 0)

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
            <CardDescription>Unable to load pipeline data</CardDescription>
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
                  <BreadcrumbPage>Deal Pipeline</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={loadPipelineData} disabled={loadingPipeline}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPipeline ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Deal Pipeline</h2>
              <p className="text-sm text-muted-foreground">
                Track deals through every stage of your sales process
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDeals}</div>
                <p className="text-xs text-muted-foreground">
                  Active in pipeline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Total deal value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Math.round(totalValue / totalDeals))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all stages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Age</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(pipelineData.reduce((sum, stage) => sum + stage.avgAge, 0) / pipelineData.length)}d
                </div>
                <p className="text-xs text-muted-foreground">
                  Days in pipeline
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
              <CardDescription>
                Visual representation of your deal flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {pipelineData.map((stage, index) => (
                  <div key={stage.stage} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getStageColor(stage.stage)}>
                          {stage.stage}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {stage.conversion}% conversion
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{stage.count} deals</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(stage.value)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stage Progress</span>
                        <span>{stage.conversion}%</span>
                      </div>
                      <Progress value={stage.conversion} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Values:</span>
                        <div className="font-semibold">{formatCurrency(stage.value)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Size:</span>
                        <div className="font-semibold">
                          {formatCurrency(Math.round(stage.value / stage.count))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Age:</span>
                        <div className="font-semibold">{stage.avgAge} days</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Velocity</CardTitle>
              <CardDescription>
                Track how quickly deals move through your pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Detailed pipeline velocity analysis coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
