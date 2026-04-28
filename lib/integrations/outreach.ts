import axios from 'axios'
import type { CanonicalEvent, ActivityData } from '../types/database'

export interface OutreachTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface OutreachSequence {
  id: string
  name: string
  state: string
  created_at: string
  updated_at: string
  stats: SequenceStats
}

export interface SequenceStats {
  total_prospects: number
  active_prospects: number
  replied_prospects: number
  interested_prospects: number
  booked_prospects: number
  Opted_outs: number
}

export interface OutreachProspect {
  id: string
  emails: Array<{ email: string; type: string }>
  phones: Array<{ phone: string; type: string }>
  fields: Record<string, any>
  created_at: string
  updated_at: string
}

export interface OutreachMailboxEvent {
  id: string
  type: string
  state: string
  created_at: string
  prospect_id: string
  sequence_id?: string
  sequence_state_id?: string
  body: string
  subject: string
  reply_to_id?: string
  opens: number
  clicks: number
  replies: number
}

export interface OutreachSequenceState {
  id: string
  prospect_id: string
  sequence_id: string
  state: string // active, finished, paused, bounced, etc.
  started_at?: string
  finished_at?: string
  last_action_at?: string
  current_step?: number
}

// OAuth Integration
export async function exchangeOutreachCode(
  code: string,
  redirectUri: string
): Promise<OutreachTokenResponse> {
  const clientId = process.env.OUTREACH_CLIENT_ID!
  const clientSecret = process.env.OUTREACH_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.outreach.io/oauth/token',
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

export async function refreshOutreachToken(
  refreshToken: string
): Promise<OutreachTokenResponse> {
  const clientId = process.env.OUTREACH_CLIENT_ID!
  const clientSecret = process.env.OUTREACH_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.outreach.io/oauth/token',
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

// Data Extraction Methods
export async function fetchOutreachSequences(
  accessToken: string
): Promise<OutreachSequence[]> {
  const response = await axios.get('https://api.outreach.io/api/v2/sequences', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.api+json',
    },
    params: {
      include: 'stats',
      'page[size]': 50,
    },
  })

  return response.data.data
}

export async function fetchOutreachSequenceStates(
  accessToken: string,
  sequenceId?: string
): Promise<OutreachSequenceState[]> {
  const url = sequenceId 
    ? `https://api.outreach.io/api/v2/sequences/${sequenceId}/sequenceStates`
    : 'https://api.outreach.io/api/v2/sequenceStates'

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.api+json',
    },
    params: {
      'page[size]': 100,
      'filter[state]': 'active,finished',
    },
  })

  return response.data.data
}

export async function fetchOutreachMailboxEvents(
  accessToken: string,
  lastSyncDate?: Date
): Promise<OutreachMailboxEvent[]> {
  const params: any = {
    'page[size]': 100,
    'sort': 'createdAt',
  }

  // Filter for events since last sync
  if (lastSyncDate) {
    params['filter[createdAt][ge]'] = lastSyncDate.toISOString()
  }

  const response = await axios.get('https://api.outreach.io/api/v2/mailboxEvents', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.api+json',
    },
    params,
  })

  return response.data.data
}

export async function fetchOutreachProspects(
  accessToken: string,
  prospectIds?: string[]
): Promise<OutreachProspect[]> {
  let url = 'https://api.outreach.io/api/v2/prospects'
  
  if (prospectIds && prospectIds.length > 0) {
    url += `/${prospectIds.join(',')}`
  }

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.api+json',
    },
    params: {
      'page[size]': prospectIds?.length || 50,
    },
  })

  return Array.isArray(response.data.data) 
    ? response.data.data 
    : [response.data.data]
}

// Transform to canonical events
export function transformOutreachEvent(
  event: OutreachMailboxEvent,
  prospect: OutreachProspect | null,
  sequence: OutreachSequence | null,
  sequenceState: OutreachSequenceState | null
): CanonicalEvent {
  const timestamp = new Date(event.created_at)
  
  // Determine event type and outcome
  let eventType = 'email_sent'
  let outcome = 'sent'
  
  if (event.type === 'email_reply') {
    eventType = 'email_reply'
    outcome = event.state === 'bounced' ? 'bounced' : 
               event.state === 'delivered' ? 'received' : 'replied'
  } else if (event.type === 'email_open') {
    eventType = 'email_open'
  } else if (event.type === 'email_click') {
    eventType = 'email_click'
  }

  return {
    id: `outreach_${event.id}`,
    timestamp: timestamp.toISOString(),
    source: 'outreach',
    event_type: eventType,
    subject: event.subject,
    body: event.body?.substring(0, 1000), // Limit body length
    external_ids: {
      event_id: event.id,
      prospect_id: event.prospect_id || '',
      sequence_id: event.sequence_id || '',
      sequence_state_id: event.sequence_state_id || ''
    },
    entities: {
      prospect_id: event.prospect_id || '',
      contact_ids: prospect?.emails.map(e => e.email) || [],
      campaign_id: event.sequence_id || '',
    },
    metrics: {
      opens: event.opens,
      clicks: event.clicks,
      replies: event.replies
    },
    metadata: {
      event_state: event.state,
      reply_to_id: event.reply_to_id,
      sequence_state: sequenceState?.state,
      sequence_name: sequence?.name,
      prospect_data: prospect?.fields,
      created_at: event.created_at,
      source_event_type: event.type
    }
  }
}

export function getOutreachAuthUrl(redirectUri: string): string {
  const clientId = process.env.OUTREACH_CLIENT_ID!
  const scope = 'sequences:read sequenceStates:read prospects:read mailboxEvents:read'

  return `https://api.outreach.io/oauth/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`
}

// Performance metrics calculation
export function calculateOutreachMetrics(
  sequences: OutreachSequence[],
  sequenceStates: OutreachSequenceState[],
  events: OutreachMailboxEvent[]
): ActivityData {
  const totalSequences = sequences.length
  const activeProspects = sequenceStates.filter(s => s.state === 'active').length
  const finishedProspects = sequenceStates.filter(s => s.state === 'finished').length
  
  const emailEvents = events.filter(e => e.type === 'email_sent')
  const emailReplies = events.filter(e => e.type === 'email_reply')
  const emailOpens = events.filter(e => e.type === 'email_open')
  
  const replyRate = emailEvents.length > 0 ? (emailReplies.length / emailEvents.length) * 100 : 0
  const openRate = emailEvents.length > 0 ? (emailOpens.length / emailEvents.length) * 100 : 0
  
  const bookedMeetings = sequenceStates.filter(s => 
    s.state === 'finished' && events.some(e => 
      e.prospect_id === s.prospect_id && e.subject?.toLowerCase().includes('meeting')
    )
  ).length

  return {
    total_activities: events.length,
    email_sent: emailEvents.length,
    email_replies: emailReplies.length,
    email_opens: emailOpens.length,
    reply_rate: Math.round(replyRate * 100) / 100,
    open_rate: Math.round(openRate * 100) / 100,
    meetings_booked: bookedMeetings,
    active_sequence_members: activeProspects,
    finished_sequence_members: finishedProspects,
    sequence_coverage: totalSequences > 0 ? (activeProspects / sequences.reduce((sum, seq) => sum + (seq.stats.total_prospects || 0), 0)) * 100 : 0
  }
}
