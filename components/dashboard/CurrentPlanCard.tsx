'use client'

import { useEffect, useState } from 'react'
import { Crown, Zap, Sparkles, Shield, ArrowUpRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { PLAN_CONFIG } from '@/lib/subscription/plans'

interface Subscription {
  plan_tier: string
  status: string
  trial_ends_at: string | null
  current_period_end: string
  cancel_at_period_end: boolean
}

export default function CurrentPlanCard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      } else if (response.status === 404) {
        // Subscription doesn't exist, try to migrate
        console.log('Subscription not found, attempting migration...')
        const migrateResponse = await fetch('/api/subscription/migrate', {
          method: 'POST'
        })
        if (migrateResponse.ok) {
          // Retry fetching subscription
          const retryResponse = await fetch('/api/subscription')
          if (retryResponse.ok) {
            const data = await retryResponse.json()
            setSubscription(data.subscription)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return null
  }

  const planConfig = PLAN_CONFIG[subscription.plan_tier as keyof typeof PLAN_CONFIG]
  
  const getPlanIcon = () => {
    switch (subscription.plan_tier) {
      case 'professional': return Crown
      case 'starter': return Zap
      case 'enterprise': return Shield
      default: return Sparkles
    }
  }

  const Icon = getPlanIcon()
  
  const getGradient = () => {
    switch (subscription.plan_tier) {
      case 'professional': return 'from-purple-500 to-pink-500'
      case 'starter': return 'from-blue-500 to-cyan-500'
      case 'enterprise': return 'from-orange-500 to-red-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const isTrialing = subscription.status === 'trialing'
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const daysLeft = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradient()} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{planConfig.name} Plan</h3>
            <p className="text-sm text-gray-500">
              {subscription.status === 'active' && 'Active'}
              {subscription.status === 'trialing' && `Trial - ${daysLeft} days left`}
              {subscription.status === 'canceled' && 'Canceled'}
            </p>
          </div>
        </div>
        
        {subscription.plan_tier !== 'enterprise' && (
          <Link 
            href="/pricing"
            className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            Upgrade
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {isTrialing && daysLeft <= 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Trial ending soon</p>
            <p className="text-xs text-amber-700 mt-1">
              Add payment method to continue using {planConfig.name} features
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Price:</span>{' '}
          {planConfig.price.monthly 
            ? `$${planConfig.price.monthly}/month`
            : subscription.plan_tier === 'free' 
              ? 'Free forever' 
              : 'Custom pricing'
          }
        </div>
        
        {subscription.cancel_at_period_end && (
          <div className="text-sm text-red-600">
            <span className="font-medium">Cancels on:</span>{' '}
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Features</h4>
        <ul className="space-y-1">
          {planConfig.features.slice(0, 3).map((feature, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
