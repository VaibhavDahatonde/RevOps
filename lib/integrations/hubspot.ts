import axios from 'axios'
import type { Opportunity, ClosedDeal } from '../types/database'

export interface HubSpotTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function exchangeHubSpotCode(
  code: string,
  redirectUri: string
): Promise<HubSpotTokenResponse> {
  const clientId = process.env.HUBSPOT_CLIENT_ID!
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.hubapi.com/oauth/v1/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  return response.data
}

export async function refreshHubSpotToken(
  refreshToken: string
): Promise<HubSpotTokenResponse> {
  const clientId = process.env.HUBSPOT_CLIENT_ID!
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.hubapi.com/oauth/v1/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  return response.data
}

export async function fetchHubSpotDeals(accessToken: string): Promise<Opportunity[]> {
  const response = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      properties: 'dealname,amount,dealstage,closedate,hubspot_owner_id,associatedcompany',
      limit: 100,
    },
  })

  return response.data.results.map((deal: any) => ({
    external_id: deal.id,
    source: 'hubspot' as const,
    name: deal.properties.dealname || '',
    amount: parseFloat(deal.properties.amount || '0'),
    stage: deal.properties.dealstage || null,
    close_date: deal.properties.closedate || null,
    probability: null,
    owner_id: deal.properties.hubspot_owner_id || null,
    owner_name: null,
    account_id: deal.properties.associatedcompany || null,
    account_name: null,
  }))
}

export async function fetchHubSpotClosedDeals(accessToken: string): Promise<ClosedDeal[]> {
  // Fetch all deals and filter for closed won
  const response = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      properties: 'dealname,amount,dealstage,closedate,createdate',
      limit: 100,
    },
  })

  // Filter for closed won deals
  const closedWonDeals = response.data.results.filter(
    (deal: any) => deal.properties.dealstage === 'closedwon'
  )

  return closedWonDeals.map((deal: any) => {
    const closeDate = deal.properties.closedate
      ? new Date(deal.properties.closedate)
      : null
    const createdDate = deal.properties.createdate
      ? new Date(deal.properties.createdate)
      : null
    const cycleTimeDays =
      closeDate && createdDate
        ? Math.floor(
            (closeDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null

    return {
      external_id: deal.id,
      source: 'hubspot' as const,
      amount: parseFloat(deal.properties.amount || '0'),
      close_date: deal.properties.closedate || null,
      created_date: deal.properties.createdate || null,
      cycle_time_days: cycleTimeDays,
      owner_id: null,
      owner_name: null,
    }
  })
}

export async function fetchHubSpotContacts(accessToken: string): Promise<
  Array<{ id: string; email: string; firstName: string; lastName: string }>
> {
  const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      properties: 'email,firstname,lastname,lifecyclestage',
      limit: 100,
    },
  })

  return response.data.results.map((contact: any) => ({
    id: contact.id,
    email: contact.properties.email || '',
    firstName: contact.properties.firstname || '',
    lastName: contact.properties.lastname || '',
  }))
}

export function getHubSpotAuthUrl(redirectUri: string): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID!
  const scope = 'crm.objects.deals.read crm.objects.contacts.read crm.objects.companies.read crm.objects.owners.read crm.schemas.deals.read'

  if (!clientId || clientId === 'your_hubspot_client_id') {
    console.warn('HubSpot client ID not configured - using development mode')
  }

  return `https://app.hubspot.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`
}

// Enhanced sync for HubSpot integration
export async function syncHubSpotData(customerId: string, accessToken: string) {
  try {
    const opportunities = await fetchHubSpotDeals(accessToken)
    const closedDeals = await fetchHubSpotClosedDeals(accessToken)
    
    // Store in database with customer ID
    // This would involve database calls to update opportunities
    
    return {
      success: true,
      opportunitiesSynced: opportunities.length,
      dealsSynced: closedDeals.length,
      syncedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('HubSpot sync failed:', error)
    throw error
  }
}

