'use client'

import { useEffect, useState } from 'react'
import { Crown, ArrowUpRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PLAN_CONFIG } from '@/lib/subscription/plans'

interface Subscription {
  plan_tier: string
  status: string
  trial_ends_at: string | null
  current_period_end: string
  cancel_at_period_end: boolean
  billing_cycle: string
}

export default function SubscriptionSection() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      console.log('[SubscriptionSection] Fetching subscription...')
      
      // Fetch subscription with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const subResponse = await fetch('/api/subscription', {
        signal: controller.signal
      }).catch(err => {
        console.error('[SubscriptionSection] Fetch error:', err)
        throw err
      }).finally(() => clearTimeout(timeoutId))
      
      console.log('[SubscriptionSection] Subscription response status:', subResponse.status)
      
      if (subResponse.ok) {
        const subData = await subResponse.json()
        console.log('[SubscriptionSection] Subscription data:', subData)
        setSubscription(subData.subscription)
      } else if (subResponse.status === 404) {
        console.log('[SubscriptionSection] Subscription not found, attempting migration...')
        // Try to migrate
        const migrateResponse = await fetch('/api/subscription/migrate', { method: 'POST' })
        const migrateData = await migrateResponse.json()
        console.log('[SubscriptionSection] Migration response status:', migrateResponse.status)
        console.log('[SubscriptionSection] Migration response data:', JSON.stringify(migrateData, null, 2))
        
        if (!migrateResponse.ok) {
          console.error('[SubscriptionSection] Migration failed!')
          console.error('[SubscriptionSection] Error:', migrateData.error)
          console.error('[SubscriptionSection] Details:', migrateData.details)
          console.error('[SubscriptionSection] Code:', migrateData.code)
          if (migrateData.stack) {
            console.error('[SubscriptionSection] Stack:', migrateData.stack)
          }
          // Continue anyway to show error state
        }
        
        if (migrateResponse.ok) {
          const retryResponse = await fetch('/api/subscription')
          if (retryResponse.ok) {
            const subData = await retryResponse.json()
            console.log('[SubscriptionSection] Subscription after migration:', subData)
            setSubscription(subData.subscription)
          }
        }
      } else {
        const errorData = await subResponse.json()
        console.error('[SubscriptionSection] Error fetching subscription:', errorData)
      }

    } catch (error) {
      console.error('[SubscriptionSection] Failed to fetch subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-4 bg-white/10 rounded w-2/3"></div>
          <div className="h-10 bg-white/10 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Subscription & Billing</h2>
        </div>
        <div className="space-y-4">
          <p className="text-gray-400">Unable to load subscription information</p>
          <button
            onClick={fetchSubscriptionData}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
          <p className="text-xs text-gray-500">
            If this persists, try logging out and back in, or check browser console (F12) for errors.
          </p>
        </div>
      </div>
    )
  }

  const planConfig = PLAN_CONFIG[subscription.plan_tier as keyof typeof PLAN_CONFIG]
  
  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">Subscription</h2>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm text-gray-400">Current Plan</label>
          <div className="text-white mt-1 text-lg font-semibold capitalize">{planConfig.name}</div>
        </div>
        
        {subscription.plan_tier !== 'enterprise' && (
          <Link 
            href="/pricing"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-lg transition-all font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/25"
          >
            Upgrade
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
