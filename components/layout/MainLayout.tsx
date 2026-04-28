'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { Toaster } from 'sonner'

interface MainLayoutProps {
  children: React.ReactNode
  onSync: () => void
  syncing: boolean
  lastSync?: string | null
  customer?: any
}

export default function MainLayout({
  children,
  onSync,
  syncing,
  lastSync,
  customer,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        customer={customer}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onSync={onSync}
          syncing={syncing}
          lastSync={lastSync}
        />

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181B',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
          },
        }}
      />
    </div>
  )
}
