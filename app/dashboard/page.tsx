'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer, refreshCustomerFromAnywhere } from '@/hooks/useCustomer'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import DashboardContent from "@/components/dashboard-content"

export default function DashboardPage() {
  const router = useRouter()
  const { customer, customerId, loading, error, skipOnboarding } = useCustomer()
  const [pageLoading, setPageLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    setRetrying(true)
    refreshCustomerFromAnywhere()
    setTimeout(() => setRetrying(false), 2000)
  }

  useEffect(() => {
    if (loading) return

    setPageLoading(false)

    if (error && error.includes('timeout')) {
      console.warn('Customer fetch timeout - showing retry option')
      return
    }

    if (error && !customer) {
      console.error('Dashboard error:', error)
      router.push('/login')
      return
    }

    if (!customer && !error) {
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const skipOnboardingParam = urlParams.get('skip_onboarding') === 'true'
    
    let hasConnections = customer?.salesforce_connected || 
                        customer?.hubspot_connected ||
                        customer?.gong_connected ||
                        customer?.outreach_connected ||
                        customer?.salesloft_connected ||
                        customer?.skip_onboarding || 
                        skipOnboardingParam || 
                        false

    if (!hasConnections && !skipOnboardingParam) {
      const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0', 10)
      if (redirectCount > 2) {
        console.warn('Preventing redirect loop, forcing skip onboarding')
        sessionStorage.setItem('redirectCount', '0')
        skipOnboarding()
        return
      }
      
      sessionStorage.setItem('redirectCount', (redirectCount + 1).toString())
      router.push('/onboarding')
    } else {
      sessionStorage.setItem('redirectCount', '0')
    }
  }, [loading, error, customer, router, skipOnboarding])

  if (loading || pageLoading || retrying) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{retrying ? 'Retrying...' : 'Loading dashboard...'}</p>
        </div>
      </div>
    )
  }

  if (error && error.includes('timeout')) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-2">Connection timed out</p>
          <p className="text-muted-foreground mb-4 text-sm">The server took too long to respond</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!customerId) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">No customer data available</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar user={{ email: customer?.email || undefined, name: customer?.company_name || undefined }} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <DashboardContent customerId={customerId} customer={customer} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
