import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getLogger } from '@/lib/utils/logger'
import { ERROR_CODES, HTTP_STATUS_CODES } from '@/lib/constants'
import { integrationManager, type WebhookEvent } from '@/lib/integrations/integration-manager'

const logger = getLogger('webhook-ingestion')

// Webhook signature verification
export async function verifyWebhookSignature(
  provider: string,
  signature: string,
  payload: string,
  secret?: string
): Promise<boolean> {
  try {
    switch (provider.toLowerCase()) {
      case 'salesforce':
        return verifySalesforceSignature(signature, payload, secret)
      case 'hubspot':
        return verifyHubSpotSignature(signature, payload, secret)
      case 'stripe':
        return verifyStripeSignature(signature, payload, secret)
      case 'gong':
        return verifyGongSignature(signature, payload, secret)
      default:
        logger.warn('Unknown webhook provider', { provider })
        return false
    }
  } catch (error) {
    logger.error('Webhook signature verification failed', { provider, error })
    return false
  }
}

// Salesforce signature verification
function verifySalesforceSignature(signature: string, payload: string, secret?: string): boolean {
  const clientSecret = secret || process.env.SALESFORCE_CLIENT_SECRET
  if (!clientSecret) {
    logger.warn('Salesforce client secret not configured')
    return false
  }

  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('base64')
    
    return signature === expectedSignature
  } catch (error: any) {
    logger.error('Salesforce signature verification error', error)
    return false
  }
}

// HubSpot signature verification
function verifyHubSpotSignature(signature: string, payload: string, secret?: string): boolean {
  const clientSecret = secret || process.env.HUBSPOT_CLIENT_SECRET
  if (!clientSecret) {
    logger.warn('HubSpot client secret not configured')
    return false
  }

  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature
  } catch (error: any) {
    logger.error('HubSpot signature verification error', error)
    return false
  }
}

// Stripe signature verification
function verifyStripeSignature(signature: string, payload: string, secret?: string): boolean {
  const webhookSecret = secret || process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.warn('Stripe webhook secret not configured')
    return false
  }

  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('utf-8')
    
    return signature === expectedSignature
  } catch (error: any) {
    logger.error('Stripe signature verification error', error)
    return false
  }
}

// Gong signature verification
function verifyGongSignature(signature: string, payload: string, secret?: string): boolean {
  try {
    const jwt = require('jsonwebtoken')
    const jwtSecret = secret || process.env.GONG_WEBHOOK_SECRET
    
    if (!jwtSecret) {
      logger.warn('Gong webhook secret not configured')
      return false
    }

    const decoded = jwt.verify(signature, jwtSecret)
    return !!decoded
  } catch (error: any) {
    logger.error('Gong signature verification error', error)
    return false
  }
}

// Main webhook handler
export async function handleWebhookRequest(
  provider: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature') || 
                     request.headers.get('x-hubspot-signature') ||
                     request.headers.get('stripe-signature') ||
                     ''

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(provider, signature, rawBody)
    if (!isValid) {
      logger.warn('Invalid webhook signature', { provider })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: HTTP_STATUS_CODES.UNAUTHORIZED }
      )
    }

    // Parse webhook payload
    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      logger.error('Invalid webhook JSON', { provider, error })
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: HTTP_STATUS_CODES.BAD_REQUEST }
      )
    }

    // Create webhook event object
    const webhookEvent: WebhookEvent = {
      provider: provider.toLowerCase() as any,
      eventType: determineEventType(provider, payload),
      payload,
      timestamp: new Date().toISOString(),
      signature,
      headers: Object.fromEntries(request.headers.entries())
    }

    // Process webhook through integration manager
    await processWebhookEvent(webhookEvent)

    // Store raw webhook event for audit
    await storeWebhookEvent(webhookEvent)

    logger.info('Webhook processed successfully', {
      provider,
      eventType: webhookEvent.eventType,
      payloadSize: rawBody.length
    })

    return NextResponse.json({ 
      success: true,
      received: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Webhook processing failed', { provider, error })
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR }
    )
  }
}

// Process webhook event (simplified version)
async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    logger.info('Processing webhook event', {
      provider: event.provider,
      eventType: event.eventType
    })
    
    // In a real implementation, this would:
    // 1. Normalize the event data
    // 2. Update database records
    // 3. Trigger AI processing
    // 4. Send real-time updates
    
    // For now, just log that we received it
    console.log(`Webhook event processed: ${event.provider} - ${event.eventType}`)
  } catch (error) {
    logger.error('Failed to process webhook event', { 
      provider: event.provider, 
      eventType: event.eventType, 
      error 
    })
    throw error
  }
}

// Determine event type based on provider and payload
function determineEventType(provider: string, payload: any): string {
  switch (provider.toLowerCase()) {
    case 'salesforce':
      return `${payload.objectType || 'unknown'}.${payload.action || 'unknown'}`
    
    case 'hubspot':
      return payload.subscriptionType || payload.objectType || 'unknown'
    
    case 'stripe':
      return payload.type || 'unknown'
    
    case 'gong':
      return payload.eventType || 'call.created'
    
    default:
      return 'webhook.received'
  }
}

// Store webhook event in database
async function storeWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    const serviceSupabase = await createServiceClient()
    
    const { error } = await serviceSupabase
      .from('canonical_events') // Use canonical_events table
      .insert({
        customer_id: '00000000-0000-0000-0000-000000000000', // Will be updated after normalization
        timestamp: event.timestamp,
        source: event.provider,
        event_type: event.eventType,
        subject: `Webhook: ${event.eventType}`,
        body: JSON.stringify(event.payload),
        metadata: {
          headers: event.headers,
          signature: event.signature
        }
      })
    
    if (error) {
      logger.error('Failed to store webhook event', { 
        provider: event.provider, 
        error 
      })
    }
  } catch (error) {
    logger.error('Error storing webhook event', { 
      provider: event.provider, 
      error 
    })
  }
}

// Queue webhook for async processing
export async function queueWebhookProcessing(event: WebhookEvent): Promise<void> {
  try {
    logger.info('Queuing webhook for processing', {
      provider: event.provider,
      eventType: event.eventType
    })
  } catch (error) {
    logger.error('Failed to queue webhook', { 
      provider: event.provider, 
      error 
    })
  }
}

// Webhook health check endpoint
export async function webhookHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  providers: Record<string, boolean>
  lastProcessed: string | null
}> {
  try {
    const serviceSupabase = await createServiceClient()
    
    // Check recent webhook processing
    const { data: recentEvents, error } = await serviceSupabase
      .from('canonical_events')
      .select('source, timestamp')
      .order('timestamp', { ascending: false })
      .limit(10)
    
    if (error) {
      throw error
    }

    const providers = ['salesforce', 'hubspot', 'stripe', 'gong']
    const providerStatus: Record<string, boolean> = {}
    let hasRecentEvents = false

    providers.forEach(provider => {
      const providerEvents = recentEvents?.filter(e => e.source === provider) || []
      providerStatus[provider] = providerEvents.length > 0
      if (providerEvents.length > 0) {
        hasRecentEvents = true
      }
    })

    const lastProcessed = recentEvents?.[0]?.timestamp || null
    const status = hasRecentEvents ? 'healthy' : 'degraded'

    return {
      status,
      providers: providerStatus,
      lastProcessed
    }
  } catch (error) {
    logger.error('Webhook health check failed', { error })
    return {
      status: 'unhealthy',
      providers: {},
      lastProcessed: null
    }
  }
}

// Webhook statistics
export async function getWebhookStatistics(
  provider?: string,
  dateRange?: { from: Date; to: Date }
): Promise<{
  totalEvents: number
  eventsByType: Record<string, number>
  processingErrors: number
  averageProcessingTime: number
}> {
  try {
    const serviceSupabase = await createServiceClient()
    let query: any = serviceSupabase.from('canonical_events')
    
    if (provider) {
      query = query.eq('source', provider)
    }
    
    if (dateRange) {
      query = query
        .gte('timestamp', dateRange.from.toISOString())
        .lte('timestamp', dateRange.to.toISOString())
    }
    
    const { data, error } = await query.select('event_type, created_at')
    
    if (error) {
      throw error
    }
    
    const totalEvents = data?.length || 0
    const eventsByType: Record<string, number> = {}
    
    data?.forEach((event: any) => {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1
    })
    
    return {
      totalEvents,
      eventsByType,
      processingErrors: 0,
      averageProcessingTime: 0
    }
  } catch (error) {
    logger.error('Failed to get webhook statistics', { error })
    return {
      totalEvents: 0,
      eventsByType: {},
      processingErrors: 0,
      averageProcessingTime: 0
    }
  }
}
