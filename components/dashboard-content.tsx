"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  BarChart3,
  Activity,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardContentProps {
  customerId: string
  customer?: any
}

const statsData = [
  {
    title: "Pipeline Value",
    value: "$2.4M",
    change: "+12.5%",
    trend: "up",
    description: "vs last quarter",
    icon: DollarSign,
  },
  {
    title: "Win Rate",
    value: "34%",
    change: "+4.2%",
    trend: "up",
    description: "vs last quarter",
    icon: Target,
  },
  {
    title: "Avg Deal Size",
    value: "$48.5K",
    change: "+8.1%",
    trend: "up",
    description: "vs last quarter",
    icon: BarChart3,
  },
  {
    title: "Sales Cycle",
    value: "32 days",
    change: "-3 days",
    trend: "up",
    description: "vs last quarter",
    icon: Calendar,
  },
]

const deals = [
  {
    id: "1",
    name: "Acme Corp - Enterprise License",
    amount: "$125,000",
    stage: "Negotiation",
    probability: 75,
    health: "good",
    daysInStage: 5,
    owner: "Sarah J.",
  },
  {
    id: "2",
    name: "TechStart Inc - Annual Subscription",
    amount: "$45,000",
    stage: "Proposal",
    probability: 60,
    health: "warning",
    daysInStage: 12,
    owner: "Mike R.",
  },
  {
    id: "3",
    name: "Global Services - Multi-year Deal",
    amount: "$280,000",
    stage: "Discovery",
    probability: 30,
    health: "good",
    daysInStage: 3,
    owner: "Emma L.",
  },
  {
    id: "4",
    name: "Innovate Solutions - Pilot",
    amount: "$18,000",
    stage: "Qualification",
    probability: 45,
    health: "at-risk",
    daysInStage: 21,
    owner: "John D.",
  },
  {
    id: "5",
    name: "DataFlow Systems - Expansion",
    amount: "$92,000",
    stage: "Negotiation",
    probability: 80,
    health: "good",
    daysInStage: 7,
    owner: "Sarah J.",
  },
]

const aiInsights = [
  {
    id: "1",
    type: "warning",
    title: "Deal at Risk",
    description: "TechStart Inc has been in Proposal stage for 12 days with no recent activity.",
    action: "Schedule follow-up",
  },
  {
    id: "2",
    type: "success",
    title: "High Momentum",
    description: "Acme Corp deal is progressing 40% faster than average. Consider accelerating timeline.",
    action: "View deal",
  },
  {
    id: "3",
    type: "info",
    title: "Forecast Update",
    description: "Q4 forecast accuracy improved to 87% based on historical pattern analysis.",
    action: "View forecast",
  },
]

export default function DashboardContent({ customerId, customer }: DashboardContentProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{customer?.company_name ? `, ${customer.company_name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your pipeline today.
          </p>
        </div>
        <Button>
          <Zap className="mr-2 h-4 w-4" />
          Quick Actions
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stat.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {stat.change}
                </span>
                <span className="ml-1">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Deals Table */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
            <CardDescription>
              Your pipeline deals sorted by probability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Prob.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{deal.name}</div>
                        <div className="text-xs text-muted-foreground">{deal.owner}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{deal.stage}</Badge>
                    </TableCell>
                    <TableCell>{deal.amount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {deal.health === "good" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {deal.health === "warning" && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        {deal.health === "at-risk" && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {deal.daysInStage}d in stage
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={deal.probability} className="w-16 h-2" />
                        <span className="text-sm font-medium w-8">{deal.probability}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              Proactive recommendations from your AI agents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3",
                  insight.type === "warning" && "border-yellow-500/50 bg-yellow-500/5",
                  insight.type === "success" && "border-green-500/50 bg-green-500/5",
                  insight.type === "info" && "border-blue-500/50 bg-blue-500/5"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {insight.type === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    {insight.type === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {insight.type === "info" && (
                      <Activity className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="font-medium text-sm">{insight.title}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
                <Button variant="ghost" size="sm" className="w-fit h-7 text-xs">
                  {insight.action}
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
          <CardDescription>
            Value distribution across your sales pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { stage: "Lead", value: 420000, count: 24, color: "bg-slate-500" },
              { stage: "Qualification", value: 380000, count: 18, color: "bg-blue-500" },
              { stage: "Discovery", value: 520000, count: 12, color: "bg-violet-500" },
              { stage: "Proposal", value: 680000, count: 8, color: "bg-purple-500" },
              { stage: "Negotiation", value: 340000, count: 5, color: "bg-pink-500" },
              { stage: "Closed Won", value: 890000, count: 15, color: "bg-green-500" },
            ].map((item) => (
              <div key={item.stage} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium">{item.stage}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${(item.value / 890000) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-20 text-right">
                      ${(item.value / 1000).toFixed(0)}K
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {item.count} deals
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
