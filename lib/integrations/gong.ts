import axios from 'axios'
import type { CanonicalEvent, CallAnalysis } from '../types/database'

export interface GongTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface GongCall {
  id: string
  title: string
  direction: 'inbound' | 'outbound'
  state: 'recorded' | 'transcribed' | 'analyzed'
  started_at: string
  ended_at: string
  duration: number
  participants: GongParticipant[]
  metadata: GongMetadata
  language: string
  organized: boolean
  share_url?: string
  agenda?: string
  purpose: string // sales, customer_success, technical, etc.
  topics?: GongTopic[]
  transcripts?: GongTranscript[]
  summary?: string
  sentiment?: GongSentiment
  tracker_responses?: GongTrackerResponse[]
}

export interface GongParticipant {
  id: string
  name: string
  email: string
  external_user_id: string
  title?: string
  avatar_url?: string
  speaker_stats: GongSpeakerStats
  is_host: boolean
  is_internal: boolean
}

export interface GongSpeakerStats {
  talk_time_percentage: number
  questions_asked: number
  longest_monologue: number
  sentiment_score: number
  talk_time: number
  questions_received: number
  words_spoken: number
}

export interface GongMetadata {
  meeting_url?: string
  salesforce_url?: string
  opportunity_ids?: string[]
  account_ids?: string[]
  user_ids: string[]
  telephony_service: string
  telephony_context: any
  external_id?: string
  note_taker_url?: string
  crm_object_id?: string
}

export interface GongTopic {
  id: string
  name: string
  type: 'user_defined' | 'system_defined'
  metadata: {
    color: string
    score: number
  }
}

export interface GongTranscript {
  timestamp: number
  speaker_id: string
  speaker_name: string
  text: string
  confidence_score: number
}

export interface GongSentiment {
  overall_sentiment: 'positive' | 'neutral' | 'negative'
  positive_percentage: number
  negative_percentage: number
  neutral_percentage: number
}

export interface GongTrackerResponse {
  id: string
  tracker_name: string
  tracker_type: 'tracker' | 'scorecard'
  response: string
  confidence_score: number
  timestamp: number
  speaker_id: string
}

export interface GongWebhookEvent {
  id: string
  object_type: 'call' | 'user' | 'workspace'
  object_id: string
  event_type: 'call.updated' | 'call.completed' | 'new_transcript' | 'user.updated'
  event_timestamp: string
  metadata: any
}

// OAuth Integration
export async function exchangeGongCode(
  code: string,
  redirectUri: string
): Promise<GongTokenResponse> {
  const clientId = process.env.GONG_CLIENT_ID!
  const clientSecret = process.env.GONG_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.gong.io/oauth2/token',
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

export async function refreshGongToken(
  refreshToken: string
): Promise<GongTokenResponse> {
  const clientId = process.env.GONG_CLIENT_ID!
  const clientSecret = process.env.GONG_CLIENT_SECRET!

  const response = await axios.post(
    'https://api.gong.io/oauth2/token',
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
export async function fetchGongCalls(
  accessToken: string,
  lastSyncDate?: Date,
  limit: number = 100
): Promise<GongCall[]> {
  const params: any = {
    'cursor': 'MTA', // Start at first page
    'from': '2024-01-01', // Get calls from this year
  }

  if (lastSyncDate) {
    params['from'] = lastSyncDate.toISOString().split('T')[0]
  }

  const response = await axios.get('https://api.gong.io/v2/calls', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    params,
  })

  const calls: GongCall[] = response.data.calls || []
  
  // Handle pagination if needed
  const records = response.data.records
  const totalRecords = response.data.total_records
  
  if (totalRecords > records && totalRecords > limit) {
    // Implement pagination if needed for large datasets
    console.log(`Gong API returned ${totalRecords} calls, processing first ${limit}`)
  }

  return calls.slice(0, limit)
}

export async function fetchGongCallDetails(
  accessToken: string,
  callId: string
): Promise<GongCall> {
  const response = await axios.get(`https://api.gong.io/v2/calls/${callId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    params: {
      'include': 'transcript,summary,sentiment,trackerResponses'
    }
  })

  return response.data.call
}

export async function fetchGongCallTranscript(
  accessToken: string,
  callId: string
): Promise<GongTranscript[]> {
  const response = await axios.get(`https://api.gong.io/v2/calls/${callId}/transcript`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    params: {
      'speaker_sensitivity': 'high',
      'filter': 'true'
    }
  })

  return response.data.transcript || []
}

export async function fetchGongCallTrackerResponses(
  accessToken: string,
  callId: string
): Promise<GongTrackerResponse[]> {
  const response = await axios.get(`https://api.gong.io/v2/calls/${callId}/tracker-responses`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  })

  return response.data.trackerResponses || []
}

// AI-powered call analysis integration
export async function analyzeGongCallWithAI(
  call: GongCall,
  transcript: GongTranscript[]
): Promise<{
  topics: string[]
  action_items: string[]
  risk_signals: string[]
  buying_signals: string[]
  competitor_mentions: string[]
  price_discussion: boolean
  confidence_score: number
  recommendations: string[]
}> {
  
  // Prepare transcript text for AI analysis
  const transcriptText = transcript
    .filter(t => t.confidence_score > 0.7)
    .map(t => `[${t.speaker_name}]: ${t.text}`)
    .join('\n')
    .substring(0, 4000) // Limit for AI context

  const participantsInfo = call.participants
    .filter(p => p.is_internal)
    .map(p => `${p.name} (${p.title || 'Rep'})`)
    .join(', ')

  const prompt = `
    You are analyzing a sales call transcript for deal risk and opportunity insights.
    
    Call Details:
    - Title: ${call.title}
    - Duration: ${call.duration} minutes
    - Purpose: ${call.purpose}
    - Internal Participants: ${participantsInfo}
    - Call Summary: ${call.summary || 'No summary available'}
    
    Transcript (Last 4000 characters):
    ${transcriptText}
    
    Provide analysis in this JSON format:
    {
      "topics": ["topic1", "topic2"],
      "action_items": ["action1", "action2"],
      "risk_signals": ["risk1", "risk2"],
      "buying_signals": ["signal1", "signal2"],
      "competitor_mentions": ["competitor1", "competitor2"],
      "price_discussion": true/false,
      "confidence_score": 75,
      "recommendations": ["recommendation1", "recommendation2"]
    }
    
    Focus on:
    - Customer objections and concerns
    - Buying signals and next steps
    - Competitive threats
    - Pricing discussions
    - Action items for follow-up
    - Overall deal confidence (0-100)
  `

  // This would call your AI service (Gemini, Claude, etc.)
  // For now, return structured mock analysis
  const mockAnalysis = {
    topics: call.topics?.map(t => t.name) || [],
    action_items: generateActionItemsFromCall(call),
    risk_signals: generateRiskSignalsFromParticipants(call),
    buying_signals: generateBuyingSignalsFromSentiment(call),
    competitor_mentions: extractCompetitorMentions(call),
    price_discussion: detectPriceDiscussion(call.summary || ''),
    confidence_score: calculateConfidenceScore(call),
    recommendations: generateRecommendations(call)
  }

  return mockAnalysis
}

// Transform to canonical event
export function transformGongCall(
  call: GongCall,
  aiAnalysis?: any
): CanonicalEvent {
  const timestamp = new Date(call.started_at)
  
  return {
    id: `gong_call_${call.id}`,
    timestamp: timestamp.toISOString(),
    source: 'gong',
    event_type: 'call',
    subject: call.title,
    body: call.summary || `Call duration: ${call.duration} minutes, Participants: ${call.participants.length}`,
    external_ids: {
      call_id: call.id,
      external_id: call.metadata?.external_id || '',
      crm_object_id: call.metadata?.crm_object_id || ''
    },
    entities: {
      deal_id: call.metadata.opportunity_ids?.[0],
      account_id: call.metadata.account_ids?.[0],
      user_id: call.metadata.user_ids?.[0],
      contact_ids: call.participants
        .filter(p => !p.is_internal)
        .map(p => p.email)
    },
    metrics: {
      duration: call.duration,
      sentiment: call.sentiment?.positive_percentage ? 
        (call.sentiment.positive_percentage - call.sentiment.negative_percentage) : 0,
      outcome: call.purpose
    },
    metadata: {
      direction: call.direction,
      state: call.state,
      language: call.language,
      purpose: call.purpose,
      share_url: call.share_url,
      speaker_stats: call.participants.reduce((acc, participant) => {
        acc[participant.name] = participant.speaker_stats
        return acc
      }, {} as any),
      topics: call.topics?.map(t => t.name) || [],
      tracker_responses: call.tracker_responses?.map(r => ({
        tracker: r.tracker_name,
        response: r.response,
        confidence: r.confidence_score
      })),
      metadata: call.metadata,
      ai_analysis: aiAnalysis,
      started_at: call.started_at,
      ended_at: call.ended_at
    }
  }
}

export function transformGongCallAnalysis(
  callId: string,
  call: GongCall,
  aiAnalysis: any,
  transcript: GongTranscript[] = []
): CallAnalysis {
  const timestamp = new Date(call.started_at)
  
  return {
    call_id: callId,
    external_id: call.metadata.external_id || callId,
    source: 'gong',
    deal_id: call.metadata.opportunity_ids?.[0],
    participant_ids: call.participants.map(p => p.id),
    duration: call.duration,
    transcript_url: call.share_url,
    recording_url: call.share_url,
    sentiment_analysis: {
      overall_sentiment: call.sentiment?.overall_sentiment || 'neutral',
      sentiment_score: call.sentiment ? 
        (call.sentiment.positive_percentage - call.sentiment.negative_percentage) : 0,
      talk_listen_ratio: calculateTalkListenRatio(call),
      question_count: call.participants.reduce((sum, p) => sum + (p.speaker_stats?.questions_asked || 0), 0),
      competitor_mentions: aiAnalysis?.competitor_mentions || [],
      price_discussion: aiAnalysis?.price_discussion || false,
      buying_signals_count: (aiAnalysis?.buying_signals?.length || 0),
      risk_signals_count: (aiAnalysis?.risk_signals?.length || 0)
    },
    topics: [
      ...(call.topics?.map(t => t.name) || []),
      ...(aiAnalysis?.topics || [])
    ],
    action_items: aiAnalysis?.action_items || [],
    next_steps: generateNextStepsFromAnalysis(aiAnalysis, call),
    created_at: timestamp.toISOString()
  }
}

// Helper functions
export function getGongAuthUrl(redirectUri: string): string {
  const clientId = process.env.GONG_CLIENT_ID!
  const scope = 'calls:read transcripts:read users:read webhooks:write'

  return `https://app.gong.io/oauth2/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`
}

// Utility functions for analysis
function generateActionItemsFromCall(call: GongCall): string[] {
  const items: string[] = []
  
  if (call.summary?.toLowerCase().includes('follow up')) {
    items.push('Schedule follow-up call')
  }
  
  if (call.participants.some(p => !p.is_internal)) {
    items.push('Send post-call summary email')
  }
  
  return items
}

function generateRiskSignalsFromParticipants(call: GongCall): string[] {
  const signals: string[] = []
  
  const lowTalkTimeParticipants = call.participants
    .filter(p => p.is_internal)
    .filter(p => (p.speaker_stats?.talk_time_percentage || 0) < 20)
  
  if (lowTalkTimeParticipants.length > 0) {
    signals.push('Low rep participation detected')
  }
  
  if (call.sentiment?.overall_sentiment === 'negative') {
    signals.push('Negative sentiment detected')
  }
  
  return signals
}

function generateBuyingSignalsFromSentiment(call: GongCall): string[] {
  const signals: string[] = []
  
  if (call.sentiment?.positive_percentage && call.sentiment.positive_percentage > 60) {
    signals.push('Positive sentiment')
  }
  
  if (call.duration > 30) {
    signals.push('Extended call duration (engagement indicator)')
  }
  
  return signals
}

function extractCompetitorMentions(call: GongCall): string[] {
  const mentions: string[] = []
  
  // Extract from tracker responses
  if (call.tracker_responses) {
    call.tracker_responses.forEach(response => {
      if (response.tracker_name.toLowerCase().includes('competitor')) {
        mentions.push(response.response)
      }
    })
  }
  
  return mentions
}

function detectPriceDiscussion(summary: string): boolean {
  const priceKeywords = ['price', 'cost', 'budget', 'pricing', 'fee', 'discount', 'investment']
  return priceKeywords.some(keyword => summary.toLowerCase().includes(keyword))
}

function calculateConfidenceScore(call: GongCall): number {
  let score = 50 // Base score
  
  // Sentiment adjustment
  if (call.sentiment) {
    score += (call.sentiment.positive_percentage - call.sentiment.negative_percentage) * 0.3
  }
  
  // Duration adjustment (longer calls = higher confidence)
  if (call.duration > 30) score += 10
  if (call.duration > 45) score += 10
  
  // Participation adjustment
  const avgTalkTime = call.participants
    .filter(p => p.is_internal)
    .reduce((sum, p) => sum + (p.speaker_stats?.talk_time_percentage || 0), 0) / 
    (call.participants.filter(p => p.is_internal).length || 1)
  
  if (avgTalkTime > 40) score += 10
  
  return Math.min(100, Math.max(0, score))
}

function generateRecommendations(call: GongCall): string[] {
  const recommendations: string[] = []
  
  if (call.sentiment?.overall_sentiment === 'negative') {
    recommendations.push('Consider escalation to management')
  }
  
  const lowParticipation = call.participants
    .filter(p => p.is_internal)
    .filter(p => (p.speaker_stats?.talk_time_percentage || 0) < 20)
  
  if (lowParticipation.length > 0) {
    recommendations.push('Increase rep participation')
  }
  
  if (!call.tracker_responses || call.tracker_responses.length === 0) {
    recommendations.push('Enable Gong track for better analysis')
  }
  
  return recommendations
}

function calculateTalkListenRatio(call: GongCall): number {
  const internalTalkTime = call.participants
    .filter(p => p.is_internal)
    .reduce((sum, p) => sum + (p.speaker_stats?.talk_time_percentage || 0), 0)
  
  const externalTalkTime = call.participants
    .filter(p => !p.is_internal)
    .reduce((sum, p) => sum + (p.speaker_stats?.talk_time_percentage || 0), 0)
  
  return externalTalkTime > 0 ? (internalTalkTime / externalTalkTime) : 0
}

function generateNextStepsFromAnalysis(aiAnalysis: any, call: GongCall): Array<{
  action: string
  assignee?: string
  due_date?: string
}> {
  const steps: Array<{action: string, assignee?: string, due_date?: string}> = []
  
  const mainRep = call.participants.find(p => p.is_host && p.is_internal)
  const repName = mainRep?.name
  
  // Add action items from AI analysis
  if (aiAnalysis?.action_items) {
    aiAnalysis.action_items.forEach((action: string) => {
      steps.push({
        action,
        assignee: repName,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      })
    })
  }
  
  return steps
}
