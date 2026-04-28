export interface Customer {
  id: string;
  email: string;
  company_name: string | null;
  user_id: string;
  salesforce_connected: boolean;
  salesforce_token: string | null;
  salesforce_refresh_token: string | null;
  salesforce_instance_url: string | null;
  salesforce_last_sync: string | null;
  hubspot_connected: boolean;
  hubspot_token: string | null;
  hubspot_refresh_token: string | null;
  hubspot_last_sync: string | null;
  outreach_connected: boolean;
  outreach_token: string | null;
  outreach_refresh_token: string | null;
  outreach_last_sync: string | null;
  salesloft_connected: boolean;
  salesloft_token: string | null;
  salesloft_refresh_token: string | null;
  salesloft_last_sync: string | null;
  gong_connected: boolean;
  gong_token: string | null;
  gong_refresh_token: string | null;
  gong_last_sync: string | null;
  gmail_connected: boolean;
  gmail_token: string | null;
  gmail_refresh_token: string | null;
  gmail_last_sync: string | null;
  calendar_connected: boolean;
  calendar_token: string | null;
  calendar_refresh_token: string | null;
  calendar_last_sync: string | null;
  zendesk_connected: boolean;
  zendesk_token: string | null;
  zendesk_refresh_token: string | null;
  zendesk_last_sync: string | null;
  stripe_connected: boolean;
  stripe_token: string | null;
  stripe_refresh_token: string | null;
  stripe_last_sync: string | null;
  slack_connected: boolean;
  slack_token: string | null;
  slack_refresh_token: string | null;
  slack_last_sync: string | null;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  customer_id: string;
  external_id: string;
  source: 'salesforce' | 'hubspot';
  name: string;
  amount: number;
  stage: string | null;
  close_date: string | null;
  probability: number | null;
  owner_id: string | null;
  owner_name: string | null;
  account_id: string | null;
  account_name: string | null;
  risk_score?: number | null;
  risk_level?: 'low' | 'medium' | 'high' | null;
  days_since_update?: number | null;
  created_at: string;
  updated_at: string;
  synced_at: string;
}

export interface ClosedDeal {
  id: string;
  customer_id: string;
  external_id: string;
  source: 'salesforce' | 'hubspot';
  amount: number;
  close_date: string | null;
  created_date: string | null;
  cycle_time_days: number | null;
  owner_id: string | null;
  owner_name: string | null;
  synced_at: string;
}

export interface Metric {
  id: string;
  customer_id: string;
  total_pipeline: number;
  forecast: number;
  win_rate: number;
  avg_deal_size: number;
  avg_cycle_time: number;
  velocity: number;
  calculated_at: string;
}

export interface Insight {
  id: string;
  customer_id: string;
  type: 'alert' | 'insight' | 'opportunity';
  severity: 'high' | 'medium' | 'low' | 'positive';
  title: string;
  message: string;
  impact: string | null;
  recommended_action: string | null;
  status: 'active' | 'dismissed' | 'resolved';
  detected_at: string;
}

export interface ChatHistory {
  id: string;
  customer_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface Report {
  id: string;
  customer_id: string;
  type: string;
  content: string;
  generated_at: string;
}

// New extended types for comprehensive platform
export interface ActivityData {
  total_activities?: number;
  email_sent?: number;
  email_replies?: number;
  email_opens?: number;
  reply_rate?: number;
  open_rate?: number;
  meetings_booked?: number;
  calls_made?: number;
  call_duration?: number;
  active_sequence_members?: number;
  finished_sequence_members?: number;
  sequence_coverage?: number;
  sequence_id?: string;
  user_id?: string;
  period?: string;
}

export interface CanonicalEvent {
  id: string;
  timestamp: string; // ISO8601
  source: string;
  event_type: string;
  subject?: string;
  body?: string;
  external_ids?: Record<string, string>;
  entities?: {
    account_id?: string;
    deal_id?: string;
    contact_id?: string;
    user_id?: string;
    campaign_id?: string;
    prospect_id?: string;
    contact_ids?: string[];
  };
  metrics?: {
    opens?: number;
    clicks?: number;
    replies?: number;
    duration?: number;
    sentiment?: number;
    outcome?: string;
  };
  metadata?: Record<string, any>;
}

export interface SequencePerformance {
  sequence_id: string;
  sequence_name: string;
  total_prospects: number;
  active_prospects: number;
  replied_prospects: number;
  booked_prospects: number;
  reply_rate: number;
  meeting_rate: number;
  avg_response_time: number; // hours
}

export interface CallAnalysis {
  call_id: string;
  external_id: string;
  source: string;
  deal_id?: string;
  participant_ids: string[];
  duration: number; // minutes
  transcript_url?: string;
  recording_url?: string;
  sentiment_analysis: {
    overall_sentiment: 'positive' | 'neutral' | 'negative';
    sentiment_score: number; // -100 to 100
    talk_listen_ratio: number;
    question_count: number;
    competitor_mentions: string[];
    price_discussion: boolean;
    buying_signals_count: number;
    risk_signals_count: number;
  };
  topics: string[];
  action_items: string[];
  next_steps: Array<{
    action: string;
    assignee?: string;
    due_date?: string;
  }>;
  created_at: string;
}

export interface MarketingAttribution {
  touchpoint_id: string;
  campaign_id: string;
  contact_id: string;
  account_id?: string;
  deal_id?: string;
  touchpoint_type: 'email_sent' | 'email_open' | 'email_click' | 'form_submit' | 'web_visit' | 'webinar_attended';
  timestamp: string;
  source: string;
  cost_cents?: number;
  channel: string;
  attribution_credit?: number; // 0-100
}

export interface SupportAnalysis {
  ticket_id: string;
  external_id: string;
  source: string;
  account_id?: string;
  contact_id?: string;
  satisfaction_score?: number; // 1-5
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  resolution_time_hours?: number;
  sentiment_score?: number; // -100 to 100
  churning_risk?: number; // 0-100
  expansion_opportunity?: number; // 0-100
  topics: string[];
  created_at: string;
}

export interface BillingMetrics {
  subscription_id: string;
  account_id?: string;
  status: 'active' | 'canceled' | 'trialing' | 'past_due';
  amount_cents: number;
  currency: string;
  billing_period: string;
  churn_risk_score: number;
  expansion_score: number;
  mrr_cents: number;
  arr_cents: number;
  created_at: string;
}

