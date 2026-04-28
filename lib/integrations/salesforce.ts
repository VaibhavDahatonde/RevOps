import axios from 'axios'
import crypto from 'crypto'
import type { Opportunity, ClosedDeal } from '../types/database'

export interface SalesforceTokenResponse {
  access_token: string
  refresh_token: string
  instance_url: string
  id: string
}

// PKCE Helper Functions
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export async function exchangeSalesforceCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<SalesforceTokenResponse> {
  const clientId = process.env.SALESFORCE_CLIENT_ID!
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET!
  const baseUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'

  const response = await axios.post(
    `${baseUrl}/services/oauth2/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
      code_verifier: codeVerifier,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  return response.data
}

export async function refreshSalesforceToken(
  refreshToken: string
): Promise<SalesforceTokenResponse> {
  const clientId = process.env.SALESFORCE_CLIENT_ID!
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET!

  const response = await axios.post(
    'https://login.salesforce.com/services/oauth2/token',
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

export async function fetchSalesforceOpportunities(
  instanceUrl: string,
  accessToken: string
): Promise<Opportunity[]> {
  const query = `SELECT Id, Name, Amount, StageName, CloseDate, Probability, OwnerId, Owner.Name, AccountId, Account.Name FROM Opportunity WHERE IsClosed = false`
  const encodedQuery = encodeURIComponent(query)

  const response = await axios.get(
    `${instanceUrl}/services/data/v58.0/query?q=${encodedQuery}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  return response.data.records.map((record: any) => ({
    external_id: record.Id,
    source: 'salesforce' as const,
    name: record.Name || '',
    amount: record.Amount || 0,
    stage: record.StageName || null,
    close_date: record.CloseDate || null,
    probability: record.Probability || null,
    owner_id: record.OwnerId || null,
    owner_name: record.Owner?.Name || null,
    account_id: record.AccountId || null,
    account_name: record.Account?.Name || null,
  }))
}

export async function fetchSalesforceClosedDeals(
  instanceUrl: string,
  accessToken: string
): Promise<ClosedDeal[]> {
  const query = `SELECT Id, Amount, CloseDate, CreatedDate FROM Opportunity WHERE IsWon = true ORDER BY CloseDate DESC LIMIT 100`
  const encodedQuery = encodeURIComponent(query)

  const response = await axios.get(
    `${instanceUrl}/services/data/v58.0/query?q=${encodedQuery}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  return response.data.records.map((record: any) => {
    const closeDate = record.CloseDate ? new Date(record.CloseDate) : null
    const createdDate = record.CreatedDate ? new Date(record.CreatedDate) : null
    const cycleTimeDays =
      closeDate && createdDate
        ? Math.floor(
            (closeDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null

    return {
      external_id: record.Id,
      source: 'salesforce' as const,
      amount: record.Amount || 0,
      close_date: record.CloseDate || null,
      created_date: record.CreatedDate || null,
      cycle_time_days: cycleTimeDays,
      owner_id: null,
      owner_name: null,
    }
  })
}

export async function fetchSalesforceUsers(
  instanceUrl: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; email: string }>> {
  const query = `SELECT Id, Name, Email FROM User WHERE IsActive = true`
  const encodedQuery = encodeURIComponent(query)

  const response = await axios.get(
    `${instanceUrl}/services/data/v58.0/query?q=${encodedQuery}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  return response.data.records.map((record: any) => ({
    id: record.Id,
    name: record.Name,
    email: record.Email,
  }))
}

// Salesforce integration utils
// Use SALESFORCE_LOGIN_URL env var for custom domains or sandboxes
// Examples: https://login.salesforce.com, https://test.salesforce.com, https://mycompany.my.salesforce.com
const SALESFORCE_BASE_URL = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'

export function getSalesforceAuthUrl(redirectUri: string, codeChallenge: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID!
  const scope = 'api refresh_token'
  const responseType = 'code'

  // Check if we have a real client ID
  if (!clientId || clientId === 'your_salesforce_client_id') {
    console.warn('Salesforce client ID not configured - using development mode')
  }

  const params = new URLSearchParams({
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${SALESFORCE_BASE_URL}/services/oauth2/authorize?${params.toString()}`
}

// Enhanced sync for Salesforce integration
export async function syncSalesforceData(customerId: string, instanceUrl: string, accessToken: string) {
  try {
    const opportunities = await fetchSalesforceOpportunities(instanceUrl, accessToken)
    const closedDeals = await fetchSalesforceClosedDeals(instanceUrl, accessToken)
    
    // Store in database with customer ID
    // This would involve database calls to update opportunities
    
    return {
      success: true,
      opportunitiesSynced: opportunities.length,
      dealsSynced: closedDeals.length,
      syncedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Salesforce sync failed:', error)
    throw error
  }
}

