'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  TrendingUp,
  Bot,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '../ui/badge'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  customer?: any
}

const navigation = [
  {
    name: 'Ask AI',
    href: '/dashboard',
    icon: MessageSquare,
    badge: null,
  },
  {
    name: 'Forecast Accuracy',
    href: '/dashboard?tab=forecast',
    icon: TrendingUp,
    badge: null,
  },
  {
    name: 'Deal Risk Scoring',
    href: '/dashboard?tab=deals',
    icon: Bot,
    badge: null,
  },
  {
    name: 'Overview',
    href: '/dashboard?tab=overview',
    icon: LayoutDashboard,
    badge: null,
  },
]

const bottomNavigation = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'Help & Support',
    href: '#',
    icon: HelpCircle,
  },
]

export default function Sidebar({ isOpen, onToggle, customer }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('overview')

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams?.get('tab') || 'overview'
    setActiveTab(tab)
  }, [searchParams])

  const handleNavigation = (href: string) => {
    router.push(href)
    // Close sidebar on mobile after navigation
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onToggle()
    }
  }

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return !searchParams?.get('tab') || activeTab === 'query'
    } else if (href.includes('tab=forecast')) {
      return activeTab === 'forecast'
    } else if (href.includes('tab=deals')) {
      return activeTab === 'deals'
    } else if (href.includes('tab=overview')) {
      return activeTab === 'overview'
    }
    return false
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/10 bg-[#0A0A0A] transition-transform duration-300',
          // On mobile: hide by default, show when isOpen
          !isOpen && '-translate-x-full',
          isOpen && 'translate-x-0',
          // On desktop (lg): always visible
          'lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Close Button */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">RevOps AI</span>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.href)
              
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-purple-600/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className={cn('h-5 w-5 transition-colors duration-200', isActive && 'text-purple-400')} />
                  <span className="transition-colors duration-200">{item.name}</span>
                  {item.badge && (
                    <Badge variant="success" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>


          {/* Connection Status */}
          {customer && (
            <div className="border-t border-white/10 p-4 space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Connected
              </p>
              {customer.salesforce_connected && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Salesforce</span>
                </div>
              )}
              {customer.hubspot_connected && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>HubSpot</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="border-t border-white/10 p-4 space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}
