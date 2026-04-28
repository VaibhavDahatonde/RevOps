'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  TrendingUp,
  Bot,
  MessageSquare,
  Settings,
  Search,
  RefreshCw,
} from 'lucide-react'

interface CommandPaletteProps {
  onSync?: () => void
}

export default function CommandPalette({ onSync }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = useCallback((value: string) => {
    setOpen(false)
    
    switch (value) {
      case 'overview':
        router.push('/dashboard')
        break
      case 'deals':
        router.push('/dashboard?tab=deals')
        break
      case 'ai-agents':
        router.push('/dashboard?tab=ai-activity')
        break
      case 'chat':
        router.push('/dashboard?tab=chat')
        break
      case 'settings':
        router.push('/settings')
        break
      case 'sync':
        onSync?.()
        break
    }
  }, [router, onSync])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/3 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
          >
            <Command className="overflow-hidden rounded-xl border border-white/20 bg-[#18181B] shadow-2xl">
              <div className="flex items-center border-b border-white/10 px-4">
                <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
                <Command.Input
                  placeholder="Type a command or search..."
                  className="flex h-14 w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-500"
                />
              </div>

              <Command.List className="max-h-96 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-gray-400">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation" className="mb-2">
                  <div className="mb-1 px-2 text-xs font-medium text-gray-500">
                    NAVIGATION
                  </div>

                  <Command.Item
                    value="overview"
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white data-[selected]:bg-white/10 data-[selected]:text-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                  </Command.Item>

                  <Command.Item
                    value="deals"
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white data-[selected]:bg-white/10 data-[selected]:text-white"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Deals & Pipeline</span>
                  </Command.Item>

                  <Command.Item
                    value="ai-agents"
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white data-[selected]:bg-white/10 data-[selected]:text-white"
                  >
                    <Bot className="h-4 w-4" />
                    <span>AI Agents</span>
                    <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-xs">New</kbd>
                  </Command.Item>

                  <Command.Item
                    value="chat"
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white data-[selected]:bg-white/10 data-[selected]:text-white"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>AI Chat</span>
                  </Command.Item>
                </Command.Group>

                <Command.Separator className="my-2 h-px bg-white/10" />

                <Command.Group heading="Actions">
                  <div className="mb-1 px-2 text-xs font-medium text-gray-500">
                    ACTIONS
                  </div>

                  <Command.Item
                    value="sync"
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white data-[selected]:bg-white/10 data-[selected]:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Sync Data</span>
                  </Command.Item>

                  <Command.Item
                    value="settings"
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white data-[selected]:bg-white/10 data-[selected]:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑</kbd>
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5">↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5">↵</kbd>
                    <span>Select</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
