import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import type { Customer, Opportunity, Insight } from '@/lib/types/database'

// Real-time WebSocket connection manager
export class RealtimeManager {
  private static instance: RealtimeManager
  private subscription: any = null
  private callbacks: Map<string, Function[]> = new Map()
  private clientId: string = crypto.randomUUID()

  private constructor() {}

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }

  // Initialize real-time connection
  async initialize(customerId: string) {
    try {
      const supabase = createClient()
      
      // Subscribe to customer-specific changes
      this.subscription = supabase
        .channel(`customer-${customerId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'opportunities', filter: `customer_id=eq.${customerId}` },
          (payload: any) => this.handleOpportunityChange(payload)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'insights', filter: `customer_id=eq.${customerId}` },
          (payload: any) => this.handleInsightChange(payload)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'canonical_events', filter: `customer_id=eq.${customerId}` },
          (payload: any) => this.handleEventChange(payload)
        )
        .subscribe()

      console.log('Real-time connection initialized for customer:', customerId)
    } catch (error) {
      console.error('Failed to initialize real-time connection:', error)
    }
  }

  // Subscribe to specific event types
  subscribe(eventType: string, callback: Function) {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, [])
    }
    this.callbacks.get(eventType)?.push(callback)
  }

  // Unsubscribe from events
  unsubscribe(eventType: string, callback?: Function) {
    if (callback) {
      const callbacks = this.callbacks.get(eventType)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    } else {
      this.callbacks.delete(eventType)
    }
  }

  // Handle opportunity changes
  private handleOpportunityChange(payload: any) {
    const eventType = payload.eventType // 'INSERT', 'UPDATE', 'DELETE'
    const opportunity = payload.new || payload.old

    // Notify subscribers
    const callbacks = this.callbacks.get('opportunity') || []
    callbacks.forEach(callback => {
      try {
        callback({
          type: 'opportunity',
          action: eventType.toLowerCase(),
          data: opportunity
        })
      } catch (error) {
        console.error('Error in opportunity callback:', error)
      }
    })

    // Trigger risk calculation updates
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      this.recalculateRiskScore(opportunity.id)
    }
  }

  // Handle insight changes
  private handleInsightChange(payload: any) {
    const eventType = payload.eventType
    const insight = payload.new || payload.old

    const callbacks = this.callbacks.get('insight') || []
    callbacks.forEach(callback => {
      try {
        callback({
          type: 'insight',
          action: eventType.toLowerCase(),
          data: insight
        })
      } catch (error) {
        console.error('Error in insight callback:', error)
      }
    })
  }

  // Handle canonical events
  private handleEventChange(payload: any) {
    const eventType = payload.eventType
    const event = payload.new || payload.old

    const callbacks = this.callbacks.get('event') || []
    callbacks.forEach(callback => {
      try {
        callback({
          type: 'event',
          action: eventType.toLowerCase(),
          data: event
        })
      } catch (error) {
        console.error('Error in event callback:', error)
      }
    })

    // Trigger AI processing for new events
    if (eventType === 'INSERT') {
      this.processEventWithAI(event)
    }
  }

  // Recalculate risk scores
  private async recalculateRiskScore(opportunityId: string) {
    try {
      // This would trigger the AI scoring system
      console.log('Recalculating risk score for opportunity:', opportunityId)
      // API call to scoring endpoint
    } catch (error) {
      console.error('Failed to recalculate risk score:', error)
    }
  }

  // Process events with AI
  private async processEventWithAI(event: any) {
    try {
      // This would trigger AI analysis
      console.log('Processing event with AI:', event.id)
      // API call to AI processing endpoint
    } catch (error) {
      console.error('Failed to process event with AI:', error)
    }
  }

  // Cleanup connection
  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    this.callbacks.clear()
  }

  // Send custom events
  emit(type: string, data: any) {
    const callbacks = this.callbacks.get(type) || []
    callbacks.forEach(callback => {
      try {
        callback({ type, action: 'custom', data })
      } catch (error) {
        console.error('Error in custom callback:', error)
      }
    })
  }
}

// React Hook for real-time updates
export function useRealtimeUpdates(customerId: string) {
  const [realtime] = useState(() => RealtimeManager.getInstance())
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (customerId) {
      realtime.initialize(customerId)
      setIsConnected(true)
    }

    return () => {
      realtime.disconnect()
      setIsConnected(false)
    }
  }, [customerId, realtime])

  return {
    subscribe: realtime.subscribe.bind(realtime),
    unsubscribe: realtime.unsubscribe.bind(realtime),
    emit: realtime.emit.bind(realtime),
    isConnected
  }
}

// Custom hook for opportunity updates
export function useOpportunityUpdates(customerId: string, onOpportunityChange: (opportunity: any) => void) {
  const { subscribe, unsubscribe } = useRealtimeUpdates(customerId)

  useEffect(() => {
    const handleOpportunityUpdate = (event: any) => {
      if (event.type === 'opportunity') {
        onOpportunityChange(event.data)
      }
    }

    subscribe('opportunity', handleOpportunityUpdate)

    return () => {
      unsubscribe('opportunity', handleOpportunityUpdate)
    }
  }, [customerId, onOpportunityChange, subscribe, unsubscribe])
}

// Custom hook for insight updates
export function useInsightUpdates(customerId: string, onInsightChange: (insight: any) => void) {
  const { subscribe, unsubscribe } = useRealtimeUpdates(customerId)

  useEffect(() => {
    const handleInsightUpdate = (event: any) => {
      if (event.type === 'insight') {
        onInsightChange(event.data)
      }
    }

    subscribe('insight', handleInsightUpdate)

    return () => {
      unsubscribe('insight', handleInsightUpdate)
    }
  }, [customerId, onInsightChange, subscribe, unsubscribe])
}

// Mock WebSocket for development (fallback)
export class MockRealtimeManager {
  private updateInterval: NodeJS.Timeout | null = null
  private callbacks: Map<string, Function[]> = new Map()

  // Method to emit events (simulating EventEmitter)
  private emit(event: string, data: any) {
    const eventCallbacks = this.callbacks.get(event) || []
    eventCallbacks.forEach(callback => callback(data))
  }

  // Method to subscribe to events
  on(event: string, callback: Function) {
    const callbacks = this.callbacks.get(event) || []
    callbacks.push(callback)
    this.callbacks.set(event, callbacks)
  }

  // Method to unsubscribe from events
  off(event: string, callback: Function) {
    const callbacks = this.callbacks.get(event) || []
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
      this.callbacks.set(event, callbacks)
    }
  }

  async initialize(customerId: string) {
    console.log('Mock real-time connection initialized')
    
    // Simulate periodic updates
    this.updateInterval = setInterval(() => {
      this.emit('mock_update', {
        timestamp: new Date().toISOString(),
        customerId,
        type: 'simulated'
      })
    }, 30000) // Every 30 seconds
  }

  disconnect() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
}

// Export default instance
export default RealtimeManager.getInstance()
