'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/hooks/useCustomer'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Loader2, 
  Settings, 
  User, 
  Bell, 
  Link2, 
  Link2Off, 
  CreditCard,
  Shield,
  LogOut,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const { customer, customerId, loading, error } = useCustomer()
  const [user, setUser] = useState<any>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (err) {
      console.error('Failed to load settings:', err)
      setPageError('Failed to load settings')
    }
  }

  const handleConnect = async (source: 'salesforce' | 'hubspot' | 'gong' | 'outreach' | 'salesloft') => {
    setConnecting(source)
    setPageError(null)
    
    try {
      const response = await fetch(`/api/connect/${source}`)
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        const errorMsg = data.error || 'Failed to initiate connection'
        setPageError(errorMsg)
        toast.error(errorMsg)
        setConnecting(null)
      }
    } catch (error: any) {
      console.error('Connection error:', error)
      const errorMsg = 'Failed to connect. Please try again.'
      setPageError(errorMsg)
      toast.error(errorMsg)
      setConnecting(null)
    }
  }

  const handleDisconnect = async (source: 'salesforce' | 'hubspot' | 'gong' | 'outreach' | 'salesloft') => {
    setDisconnecting(source)
    setPageError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      setSuccess(`${source.charAt(0).toUpperCase() + source.slice(1)} disconnected successfully`)
      toast.success(`${source.charAt(0).toUpperCase() + source.slice(1)} disconnected successfully`)
      
      // Refresh the page after a short delay to update state
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (err: any) {
      setPageError(err.message || 'Failed to disconnect')
      toast.error(err.message || 'Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar user={{ email: customer?.email || user?.email || undefined, name: customer?.company_name || undefined }} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences.
              </p>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {pageError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{pageError}</span>
            </div>
          )}

          <Tabs defaultValue="account" className="space-y-4">
            <TabsList>
              <TabsTrigger value="account">
                <User className="mr-2 h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="integrations">
                <Link2 className="mr-2 h-4 w-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="billing">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Manage your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">Change avatar</Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ''} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" defaultValue={customer?.company_name || ''} placeholder="Your company" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save changes</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Manage your security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Change your password
                      </p>
                    </div>
                    <Button variant="outline">Change password</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-factor authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security
                      </p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sign out</p>
                      <p className="text-sm text-muted-foreground">
                        Sign out of your account on this device
                      </p>
                    </div>
                    <Button variant="destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>CRM Integrations</CardTitle>
                  <CardDescription>
                    Connect your CRM to sync pipeline data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Salesforce */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a5.94 5.94 0 01-5.939-5.939 5.94 5.94 0 015.939-5.939c1.432 0 2.747.517 3.769 1.368l2.845-2.845A9.876 9.876 0 0012.545 2C6.838 2 2.143 6.695 2.143 12.402s4.695 10.402 10.402 10.402c5.707 0 9.358-4.001 9.358-9.643 0-.764-.067-1.512-.198-2.224l-9.16-.001v-.697z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Salesforce</p>
                        <p className="text-sm text-muted-foreground">
                          {customer?.salesforce_connected 
                            ? `Connected - Last sync: ${formatDate(customer?.salesforce_last_sync)}` 
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {customer?.salesforce_connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Connected</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={disconnecting === 'salesforce'}>
                              {disconnecting === 'salesforce' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Link2Off className="mr-2 h-4 w-4" />
                                  Disconnect
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Salesforce?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Your synced data will be preserved, but new data won't sync until you reconnect.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDisconnect('salesforce')}>
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button onClick={() => handleConnect('salesforce')} disabled={!!connecting}>
                        {connecting === 'salesforce' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>

                  {/* HubSpot */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                        <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.42 0c0 .873.516 1.627 1.258 1.984v2.846a5.575 5.575 0 00-2.88 1.385l-7.637-5.96a2.53 2.53 0 00.084-.626 2.52 2.52 0 00-2.52-2.52A2.52 2.52 0 00.797 2.73a2.52 2.52 0 002.52 2.52c.35 0 .683-.073.986-.203l7.498 5.852a5.567 5.567 0 00-.507 2.334 5.57 5.57 0 005.57 5.57 5.57 5.57 0 005.57-5.57 5.575 5.575 0 00-4.27-5.303z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">HubSpot</p>
                        <p className="text-sm text-muted-foreground">
                          {customer?.hubspot_connected 
                            ? `Connected - Last sync: ${formatDate(customer?.hubspot_last_sync)}` 
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {customer?.hubspot_connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Connected</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={disconnecting === 'hubspot'}>
                              {disconnecting === 'hubspot' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Link2Off className="mr-2 h-4 w-4" />
                                  Disconnect
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect HubSpot?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Your synced data will be preserved, but new data won't sync until you reconnect.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDisconnect('hubspot')}>
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button onClick={() => handleConnect('hubspot')} disabled={!!connecting}>
                        {connecting === 'hubspot' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>

                  {/* Gong */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <svg className="h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Gong</p>
                        <p className="text-sm text-muted-foreground">
                          {customer?.gong_connected 
                            ? `Connected - Last sync: ${formatDate(customer?.gong_last_sync)}` 
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {customer?.gong_connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Connected</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={disconnecting === 'gong'}>
                              {disconnecting === 'gong' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Link2Off className="mr-2 h-4 w-4" />
                                  Disconnect
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Gong?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Your synced data will be preserved, but new data won't sync until you reconnect.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDisconnect('gong')}>
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button onClick={() => handleConnect('gong')} disabled={!!connecting}>
                        {connecting === 'gong' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>

                  {/* Outreach */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                        <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-10 9.54L6 9.27"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Outreach</p>
                        <p className="text-sm text-muted-foreground">
                          {customer?.outreach_connected 
                            ? `Connected - Last sync: ${formatDate(customer?.outreach_last_sync)}` 
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {customer?.outreach_connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Connected</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={disconnecting === 'outreach'}>
                              {disconnecting === 'outreach' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Link2Off className="mr-2 h-4 w-4" />
                                  Disconnect
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Outreach?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Your synced data will be preserved, but new data won't sync until you reconnect.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDisconnect('outreach')}>
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button onClick={() => handleConnect('outreach')} disabled={!!connecting}>
                        {connecting === 'outreach' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>

                  {/* Salesloft */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 2H4c-1.11 0-2 .89H2v20H6c-1.11 0-2 .89H4v-20H20c1.11 0 2 2.89V18c-1.11 0-2 2.89zM18 20c-1.11 0-2 2.89M22 10c-1.11 0-2.89 0-1.11zM2 4H6c-1.11 0-2 2.89V6c-1.11 0-2 2.89"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Salesloft</p>
                        <p className="text-sm text-muted-foreground">
                          {customer?.salesloft_connected 
                            ? `Connected - Last sync: ${formatDate(customer?.salesloft_last_sync)}` 
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {customer?.salesloft_connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Connected</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={disconnecting === 'salesloft'}>
                              {disconnecting === 'salesloft' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Link2Off className="mr-2 h-4 w-4" />
                                  Disconnect
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Salesloft?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Your synced data will be preserved, but new data won't sync until you reconnect.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDisconnect('salesloft')}>
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button onClick={() => handleConnect('salesloft')} disabled={!!connecting}>
                        {connecting === 'salesloft' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    You are currently on the Free plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-2xl font-bold">Free</p>
                      <p className="text-sm text-muted-foreground">Forever free for small teams</p>
                    </div>
                    <Button>Upgrade to Pro</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>
                    Manage your email notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Deal alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when deals need attention
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly digest</p>
                      <p className="text-sm text-muted-foreground">
                        Weekly summary of pipeline performance
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">AI insights</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified about AI-generated recommendations
                      </p>
                    </div>
                    <Switch />
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
