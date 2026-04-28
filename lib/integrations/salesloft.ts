import axios from 'axios'
import type { CanonicalEvent, ActivityData, SequencePerformance } from '../types/database'

export interface SalesloftTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface SalesloftCadence {
  id: string
  name: string
  description: string
  state: string
  created_at: string
  updated_at: string
  person_count: number
  active_count: number
  step_count: number
  stats: CadenceStats
}

export interface CadenceStats {
  people_added: number
  people_completed: number
  people_active: number
  people_not_responding: number
  people_bounced: number
  email_response_rate: number
  meeting_booking_rate: number
}

export interface SalesloftPerson {
  id: string
  type: string
  attributes: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    title?: string
    company: string
    owner_id?: string
    created_at?: string
    updated_at?: string
    custom_fields?: Record<string, any>
  }
}

export interface SalesloftStepEvent {
  id: string
  type: string
  attributes: {
    action_type: string
    sequence_id: string
    person_id: string
    state: string
    details?: any
    happened_at: string
  }
}

export interface SalesloftEmail {
  id: string
  type: string
  attributes: {
    subject: string
    body_body: string
    state: string
    bcc_email: string
    from_name: string
    from_email_address: string
    to_email: string
    opened_at?: string
    clicked_at?: string
    replied_at?: string
    delivery_state: string
    delivery_error?: string
    step_id?: string
    person_id?: string
    created_at: string
    updated_at: string
  }
}

export interface SalesloftCall {
  id: string
  type: string
  attributes: {
    recording_url?: string
    duration_seconds: number
    from_user_id: number
    to_person_id: number
    direction: string
    disposition: string
    notes: string
    created_at: string
    updated_at: string
  }
}

// OAuth Integration
export async function exchangeSalesloftCode(
  code: string,
  redirectUri: string
): Promise<SalesloftTokenResponse> {
  const clientId = process.env.SALESLOFT_CLIENT_ID!
  const clientSecret = process.env.SALESLOFT_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.salesloft.com/oauth/token',
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

export async function refreshSalesloftToken(
  refreshToken: string
): Promise<SalesloftTokenResponse> {
  const clientId = process.env.SALESLOFT_CLIENT_ID!
  const clientSecret = process.env.SALESLOFT_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.salesloft.com/oauth/token',
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
export async function fetchSalesloftCadences(
  accessToken: string
): Promise<SalesloftCadence[]> {
  const response = await axios.get('https://api.salesloft.com/v2/cadences', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
    params: {
      'include': 'stats',
      'page[size]': 25,
    },
  })

  return response.data.data
}

export async function fetchSalesloftCadenceSteps(
  accessToken: string,
  cadenceId: string
): Promise<SalesloftStepEvent[]> {
  const response = await axios.get(`https://api.salesloft.com/v2/cadences/${cadenceId}/step_events`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
    params: {
      'page[size]': 100,
      'filter[created_at]': 'last_30_days',
    },
  })

  return response.data.data
}

export async function fetchSalesloftEmails(
  accessToken: string,
  lastSyncDate?: Date
): Promise<SalesloftEmail[]> {
  const params: any = {
    'page[size]': 100,
    'sort': 'id',
  }

  if (lastSyncDate) {
    params['filter[updated_at]'] = `last_365_days` // Get broader range to catch replies
  }

  const response = await axios.get('https://api.salesloft.com/v2/emails', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
    params,
  })

  return response.data.data
}

export async function fetchSalesloftCalls(
  accessToken: string,
  lastSyncDate?: Date
): Promise<SalesloftCall[]> {
  const params: any = {
    'page[size]': 100,
    'sort': 'created_at',
  }

  if (lastSyncDate) {
    params['filter[updated_at]'] = 'last_90_days'
  }

  const response = await axios.get('https://api.salesloft.com/v2/calls', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
    params,
  })

  return response.data.data
}

export async function fetchSalesloftPeople(
  accessToken: string,
  personIds: string[]
): Promise<SalesloftPerson[]> {
  const response = await axios.get(`https://api.salesloft.com/v2/people/${personIds.join(',')}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  return Array.isArray(response.data.data) 
    ? response.data.data 
    : [response.data.data]
}

export async function fetchSalesloftCadencePeople(
  accessToken: string,
  cadenceId: string
): Promise<SalesloftPerson[]> {
  const response = await axios.get(`https://api.salesloft.com/v2/cadences/${cadenceId}/people`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
    params: {
      'page[size]': 200,
    },
  })

  return response.data.data
}

// Transform to canonical events
export function transformSalesloftEmail(
  email: SalesloftEmail,
  person?: SalesloftPerson
): CanonicalEvent {
  const timestamp = new Date(email.attributes.updated_at)
  
  // Determine event type based on email state
  let eventType = 'email_sent'
  let outcome = 'sent'
  let openDate = email.attributes.opened_at
  let clickDate = email.attributes.clicked_at
  let replyDate = email.attributes.replied_at

  if (email.attributes.state === 'replied') {
    eventType = 'email_reply'
    outcome = 'replied'
  } else if (openDate) {
    eventType = 'email_open'
    outcome = 'opened'
  } else if (clickDate) {
    eventType = 'email_click'
    outcome = 'clicked'
  }

  return {
    id: `salesloft_email_${email.id}`,
    timestamp: timestamp.toISOString(),
    source: 'salesloft',
    event_type: eventType,
    subject: email.attributes.subject,
    body: email.attributes.body_body?.substring(0, 1000),
    external_ids: {
      email_id: email.id,
      person_id: email.attributes.person_id || '',
      step_id: email.attributes.step_id || ''
    },
    entities: {
      contact_ids: person?.attributes.email ? [person.attributes.email] : [],
      user_id: email.attributes.from_email_address || '',
      prospect_id: email.attributes.person_id || ''
    },
    metrics: {
      opens: email.attributes.opened_at ? 1 : 0,
      clicks: email.attributes.clicked_at ? 1 : 0,
      replies: email.attributes.replied_at ? 1 : 0,
      outcome
    },
    metadata: {
      delivery_error: email.attributes.delivery_error,
      bcc_email: email.attributes.bcc_email,
      from_name: email.attributes.from_name,
      opened_at: email.attributes.opened_at,
      clicked_at: email.attributes.clicked_at,
      replied_at: email.attributes.replied_at,
      created_at: email.attributes.created_at,
      updated_at: email.attributes.updated_at,
      person_data: person?.attributes
    }
  }
}

export function transformSalesloftCall(
  call: SalesloftCall,
  person?: SalesloftPerson
): CanonicalEvent {
  const timestamp = new Date(call.attributes.created_at)
  
  return {
    id: `salesloft_call_${call.id}`,
    timestamp: timestamp.toISOString(),
    source: 'salesloft',
    event_type: 'call',
    subject: `Call with ${person?.attributes.first_name || 'Contact'}`,
    body: call.attributes.notes,
    external_ids: {
      call_id: call.id,
      person_id: typeof call.attributes.to_person_id === 'string' ? call.attributes.to_person_id : call.attributes.to_person_id?.toString() || '',
    },
    entities: {
      contact_ids: person?.attributes.email ? [person.attributes.email] : [],
      user_id: call.attributes.from_user_id?.toString() || '',
      prospect_id: call.attributes.to_person_id?.toString() || ''
    },
    metrics: {
      duration: call.attributes.duration_seconds || 0,
      outcome: call.attributes.disposition?.toString() || ''
    },
    metadata: {
      recording_url: call.attributes.recording_url,
      disposition: call.attributes.disposition,
      notes: call.attributes.notes,
      direction: call.attributes.direction,
      created_at: call.attributes.created_at,
      updated_at: call.attributes.updated_at,
      person_data: person?.attributes
    }
  }
}

export function transformSalesloftStepEvent(
  stepEvent: SalesloftStepEvent,
  cadence: SalesloftCadence,
  person?: SalesloftPerson
): CanonicalEvent {
  const timestamp = new Date(stepEvent.attributes.happened_at)
  
  return {
    id: `salesloft_step_${stepEvent.id}`,
    timestamp: timestamp.toISOString(),
    source: 'salesloft',
    event_type: `cadence_${stepEvent.attributes.action_type}`,
    subject: `${cadence.name} - ${stepEvent.attributes.action_type}`,
    body: JSON.stringify(stepEvent.attributes.details),
    external_ids: {
      step_event_id: stepEvent.id,
      sequence_id: stepEvent.attributes.sequence_id,
      person_id: stepEvent.attributes.person_id
    },
    entities: {
      campaign_id: stepEvent.attributes.sequence_id,
      contact_ids: person?.attributes.email ? [person.attributes.email] : [],
      prospect_id: stepEvent.attributes.person_id
    },
    metadata: {
      action_type: stepEvent.attributes.action_type,
      state: stepEvent.attributes.state,
      details: stepEvent.attributes.details,
      cadence_name: cadence.name,
      person_data: person?.attributes,
      happened_at: stepEvent.attributes.happened_at
    }
  }
}

export function getSalesloftAuthUrl(redirectUri: string): string {
  const clientId = process.env.SALESLOFT_CLIENT_ID!
  const scope = 'cadence:read person:read email:read call:read step_event:read'

  return `https://accounts.salesloft.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`
}

// Performance metrics calculation
export function calculateSalesloftMetrics(
  cadences: SalesloftCadence[],
  emails: SalesloftEmail[],
  calls: SalesloftCall[],
  cadencePeople: SalesloftPerson[] = []
): { cadenceMetrics: SequencePerformance[], activityData: ActivityData } {
  
  // Calculate cadence performance metrics
  const cadenceMetrics: SequencePerformance[] = cadences.map(cadence => {
    const cadenceEmails = emails.filter(e => 
      e.attributes.step_id && cadencePeople.some(p => 
        p.id === e.attributes.person_id
      )
    )
    
    const emailSent = cadenceEmails.length
    const emailReplied = cadenceEmails.filter(e => e.attributes.replied_at).length
    const replyRate = emailSent > 0 ? (emailReplied / emailSent) * 100 : 0
  
    // Calculate meeting booking rate from calls
    const cadenceCalls = calls.filter(c =>
      cadencePeople.some(p => p.id === c.attributes.to_person_id.toString())
    )
    const meetingBooked = cadenceCalls.filter(c => 
      c.attributes.disposition?.toLowerCase().includes('meeting') || 
      c.attributes.notes?.toLowerCase().includes('meeting')
    ).length
    
    const meetingRate = cadenceCalls.length > 0 ? (meetingBooked / cadenceCalls.length) * 100 : 0
    
    // Calculate average response time (simplified)
    const repliedEmails = cadenceEmails.filter(e => e.attributes.replied_at && e.attributes.created_at)
    const avgResponseTime = repliedEmails.length > 0 
      ? repliedEmails.reduce((sum, email) => {
          const created = new Date(email.attributes.created_at!)
          const replied = new Date(email.attributes.replied_at!)
          return sum + (replied.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
        }, 0) / repliedEmails.length
      : 0

    return {
      sequence_id: cadence.id,
      sequence_name: cadence.name,
      total_prospects: cadence.person_count,
      active_prospects: cadence.active_count,
      replied_prospects: emailReplied,
      booked_prospects: meetingBooked,
      reply_rate: Math.round(replyRate * 100) / 100,
      meeting_rate: Math.round(meetingRate * 100) / 100,
      avg_response_time: Math.round(avgResponseTime * 100) / 100
    }
  })

  // Overall activity metrics
  const emailSent = emails.filter(e => e.attributes.state === 'sent').length
  const emailReplied = emails.filter(e => e.attributes.replied_at).length
  const emailOpened = emails.filter(e => e.attributes.opened_at).length
  
  const replyRate = emailSent > 0 ? (emailReplied / emailSent) * 100 : 0
  const openRate = emailSent > 0 ? (emailOpened / emailSent) * 100 : 0
  
  const activityData: ActivityData = {
    total_activities: emails.length + calls.length,
    email_sent: emailSent,
    email_replies: emailReplied,
    email_opens: emailOpened,
    reply_rate: Math.round(replyRate * 100) / 100,
    open_rate: Math.round(openRate * 100) / 100,
    calls_made: calls.length,
    call_duration: calls.reduce((sum, call) => sum + (call.attributes.duration_seconds / 60), 0),
    meetings_booked: calls.filter(c => 
      c.attributes.disposition?.toLowerCase().includes('meeting') || 
      c.attributes.notes?.toLowerCase().includes('meeting')
    ).length,
    active_sequence_members: cadences.reduce((sum, cadence) => sum + cadence.active_count, 0),
    sequence_coverage: 0 // Calculate based on total target coverage
  }

  return { cadenceMetrics, activityData }
}
