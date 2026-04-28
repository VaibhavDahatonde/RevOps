'use client'

import { Menu, RefreshCw, Bell, User } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils/cn'

interface HeaderProps {
  onMenuClick: () => void
  onSync: () => void
  syncing: boolean
  lastSync?: string | null
}

export default function Header({ onMenuClick, onSync, syncing, lastSync }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Command Palette Trigger */}
          <button className="hidden lg:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <span>Search...</span>
            <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-xs">⌘K</kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Last Sync Info */}
          {lastSync && (
            <span className="hidden md:block text-xs text-gray-500">
              Last sync: {new Date(lastSync).toLocaleTimeString()}
            </span>
          )}

          {/* Sync Button */}
          <Button
            onClick={onSync}
            disabled={syncing}
            size="sm"
            variant="secondary"
            className="gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
          </Button>

          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0A0A0A]" />
          </button>

          {/* User Menu */}
          <button className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
