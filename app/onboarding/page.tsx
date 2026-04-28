'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCustomer } from '@/hooks/useCustomer'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Users,
  BarChart3,
  Loader2,
  BarChart,
  Shield,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

export default function OnboardingPage() {
  const router = useRouter()
  const { customer, customerId, loading, error, skipOnboarding } = useCustomer()
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && customer && (customer.salesforce_connected || customer.hubspot_connected)) {
      router.push('/dashboard')
    }
  }, [customer, loading, router])

  const handleConnect = async (source: 'salesforce' | 'hubspot' | 'gong' | 'outreach' | 'salesloft') => {
    setConnecting(source)
    try {
      const response = await fetch(`/api/connect/${source}`)
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        const errorMsg = data.error || 'Failed to initiate connection'
        toast.error(errorMsg)
        setConnecting(null)
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to connect. Please check your configuration.')
      setConnecting(null)
    }
  }

  const handleSkip = async () => {
    skipOnboarding()
    router.push('/dashboard?skip_onboarding=true')
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart className="size-5" />
          </div>
          <span className="text-xl font-semibold">RevOps AI</span>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome to RevOps AI</CardTitle>
            <CardDescription>
              Connect your CRM to unlock powerful revenue operations insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Real-Time Metrics</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Track pipeline, win rate, and velocity
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Visual Analytics</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pipeline charts and deal tracking
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">AI Insights</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Smart alerts and recommendations
                </p>
              </div>
            </div>

            {/* CRM Connection Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">Connect your CRM</p>
              
              <Button
                variant="outline"
                className="w-full h-14 justify-between"
                onClick={() => handleConnect('salesforce')}
                disabled={connecting !== null || customer?.salesforce_connected}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a5.94 5.94 0 01-5.939-5.939 5.94 5.94 0 015.939-5.939c1.432 0 2.747.517 3.769 1.368l2.845-2.845A9.876 9.876 0 0012.545 2C6.838 2 2.143 6.695 2.143 12.402s4.695 10.402 10.402 10.402c5.707 0 9.358-4.001 9.358-9.643 0-.764-.067-1.512-.198-2.224l-9.16-.001v-.697z"/>
                    </svg>
                  </div>
                  <span className="font-medium">Salesforce</span>
                  {customer?.salesforce_connected && (
                    <Badge variant="success" className="ml-2">Connected</Badge>
                  )}
                </div>
                {connecting === 'salesforce' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 justify-between"
                onClick={() => handleConnect('hubspot')}
                disabled={connecting !== null || customer?.hubspot_connected}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-500/10">
                    <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.42 0c0 .873.516 1.627 1.258 1.984v2.846a5.575 5.575 0 00-2.88 1.385l-7.637-5.96a2.53 2.53 0 00.084-.626 2.52 2.52 0 00-2.52-2.52A2.52 2.52 0 00.797 2.73a2.52 2.52 0 002.52 2.52c.35 0 .683-.073.986-.203l7.498 5.852a5.567 5.567 0 00-.507 2.334 5.57 5.57 0 005.57 5.57 5.57 5.57 0 005.57-5.57 5.575 5.575 0 00-4.27-5.303z"/>
                    </svg>
                  </div>
                  <span className="font-medium">HubSpot</span>
                  {customer?.hubspot_connected && (
                    <Badge variant="success" className="ml-2">Connected</Badge>
                  )}
                </div>
                {connecting === 'hubspot' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 justify-between"
                onClick={() => handleConnect('gong')}
                disabled={connecting !== null || customer?.gong_connected}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-500/10">
                    <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                    </svg>
                  </div>
                  <span className="font-medium">Gong</span>
                  {customer?.gong_connected && (
                    <Badge variant="success" className="ml-2">Connected</Badge>
                  )}
                </div>
                {connecting === 'gong' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 justify-between"
                onClick={() => handleConnect('outreach')}
                disabled={connecting !== null || customer?.outreach_connected}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-green-500/10">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-10 9.54L6 9.27"/>
                    </svg>
                  </div>
                  <span className="font-medium">Outreach</span>
                  {customer?.outreach_connected && (
                    <Badge variant="success" className="ml-2">Connected</Badge>
                  )}
                </div>
                {connecting === 'outreach' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 justify-between"
                onClick={() => handleConnect('salesloft')}
                disabled={connecting !== null || customer?.salesloft_connected}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.11 0-2 .89H2v20H6c-1.11 0-2 .89H4v-20H20c1.11 0 2 2.89V18c-1.11 0-2 2.89zM18 20c-1.11 0-2 2.89M22 10c-1.11 0-2.89 0-1.11zM2 4H6c-1.11 0-2 2.89V6c-1.11 0-2 2.89"/>
                    </svg>
                  </div>
                  <span className="font-medium">Salesloft</span>
                  {customer?.salesloft_connected && (
                    <Badge variant="success" className="ml-2">Connected</Badge>
                  )}
                </div>
                {connecting === 'salesloft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Your data is encrypted and secure. We never store your CRM credentials.</span>
            </div>

            {/* Skip Option */}
            <div className="text-center">
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now and explore demo
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By connecting, you agree to our{' '}
          <Link href="#" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="#" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
