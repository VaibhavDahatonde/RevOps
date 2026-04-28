'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Customer data interface
interface CustomerData {
  id: string
  user_id: string
  email: string
  company_name: string | null
  name: string
  subscription_tier: string
  salesforce_connected: boolean
  salesforce_last_sync?: string | null
  hubspot_connected: boolean
  hubspot_last_sync?: string | null
  gong_connected: boolean
  gong_last_sync?: string | null
  outreach_connected: boolean
  outreach_last_sync?: string | null
  salesloft_connected: boolean
  salesloft_last_sync?: string | null
  skip_onboarding: boolean
  last_activity_at?: string
  created_at: string
  updated_at: string
}

export interface UseCustomerReturn {
  customer: CustomerData | null
  customerId: string | null
  loading: boolean
  error: string | null
  refreshCustomer: () => Promise<CustomerData | null | undefined>
  updateCustomer: (updates: Partial<CustomerData>) => Promise<CustomerData | void>
  skipOnboarding: () => Promise<void>
}

// Global state to share customer data across components
let globalCustomerState: {
  customer: CustomerData | null
  loading: boolean
  error: string | null
  lastFetch: number
  listeners: Set<(data: CustomerData | null, loading: boolean, error: string | null) => void>
} = {
  customer: null,
  loading: false,
  error: null,
  lastFetch: 0,
  listeners: new Set()
}

// Notify all listeners of customer data changes
function notifyListeners() {
  globalCustomerState.listeners.forEach(listener => {
    listener(
      globalCustomerState.customer, 
      globalCustomerState.loading, 
      globalCustomerState.error
    )
  })
}

// Shared fetch function with deduplication and caching
async function fetchCustomerData(): Promise<CustomerData | null> {
  const now = Date.now()
  
  // Return cached data if fetched within last 30 seconds
  if (globalCustomerState.lastFetch > 0 && 
      (now - globalCustomerState.lastFetch) < 30000 && 
      globalCustomerState.customer) {
    console.log('🔄 Using cached customer data')
    return globalCustomerState.customer
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

  try {
    console.log('🔍 Fetching fresh customer data...')
    const response = await fetch('/api/customer', {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch customer: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.customer) {
      throw new Error('No customer data in response')
    }

    globalCustomerState.customer = data.customer
    globalCustomerState.loading = false
    globalCustomerState.error = null
    globalCustomerState.lastFetch = now
    
    console.log('✅ Customer data fetched successfully')
    return data.customer

  } catch (error: unknown) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⏱️ Customer fetch timeout - will retry')
      globalCustomerState.error = 'Request timeout - please refresh'
      globalCustomerState.loading = false
      notifyListeners()
      return null // Don't throw, just return null so UI can handle it
    }
    
    globalCustomerState.error = error instanceof Error ? error.message : 'Unknown error'
    globalCustomerState.loading = false
    
    console.error('❌ Customer fetch error:', globalCustomerState.error)
    return null
  } finally {
    notifyListeners()
  }
}

// Exported hook for consuming customer data
export function useCustomer(): UseCustomerReturn {
  const router = useRouter()
  const [localState, setLocalState] = useState({
    customer: globalCustomerState.customer,
    loading: false,
    error: globalCustomerState.error
  })

  // Subscribe to global state changes
  useEffect(() => {
    const updateListener = (customer: CustomerData | null, loading: boolean, error: string | null) => {
      setLocalState({ customer, loading, error })
    }

    globalCustomerState.listeners.add(updateListener)

    // Initial fetch if no data exists
    if (!globalCustomerState.customer && !globalCustomerState.loading && !globalCustomerState.error) {
      fetchCustomerData()
    }

    return () => {
      globalCustomerState.listeners.delete(updateListener)
    }
  }, [])

  // Refresh customer data
  const refreshCustomer = useCallback(async () => {
    globalCustomerState.loading = true
    setLocalState(prev => ({ ...prev, loading: true }))
    globalCustomerState.lastFetch = 0 // Force fresh fetch
    
    try {
      const customer = await fetchCustomerData()
      return customer
    } finally {
      globalCustomerState.loading = false
      setLocalState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  // Update customer data (for PATCH operations)
  const updateCustomer = useCallback(async (updates: Partial<CustomerData>) => {
    try {
      console.log('🔄 Updating customer data:', updates)
      
      const response = await fetch('/api/customer', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Failed to update customer: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.customer) {
        globalCustomerState.customer = { ...globalCustomerState.customer, ...data.customer }
        console.log('✅ Customer data updated successfully')
        notifyListeners()
        return data.customer
      } else {
        throw new Error('No customer data in update response')
      }
    } catch (error) {
      console.error('❌ Customer update failed:', error)
      throw error
    }
  }, [])

  // Skip onboarding helper
  const skipOnboarding = useCallback(async () => {
    console.log('⏭️ Skipping onboarding...')
    await updateCustomer({ skip_onboarding: true })
  }, [updateCustomer])

  return {
    customer: localState.customer,
    customerId: localState.customer?.id || null,
    loading: localState.loading || globalCustomerState.loading,
    error: localState.error,
    refreshCustomer,
    updateCustomer,
    skipOnboarding
  }
}

// Export refresh function for manual triggering from anywhere
export function refreshCustomerFromAnywhere() {
  globalCustomerState.lastFetch = 0 // Force fresh fetch
  fetchCustomerData()
}

// Export utility to check if customer data is available
export function hasCustomerData(): boolean {
  return !!globalCustomerState.customer
}

// Export utility to clear customer data (for logout)
export function clearCustomerData() {
  globalCustomerState.customer = null
  globalCustomerState.loading = false
  globalCustomerState.error = null
  globalCustomerState.lastFetch = 0
  notifyListeners()
}
