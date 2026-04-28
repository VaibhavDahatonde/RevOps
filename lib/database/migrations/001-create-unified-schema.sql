-- RevOps Automation Platform - Unified Schema Migration
-- Creates the complete database schema with all tables, indexes, and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom types for better data validation
CREATE TYPE customer_status AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CHURNED');
CREATE TYPE account_size_category AS ENUM ('SMB', 'MID-MARKET', 'ENTERPRISE');
CREATE TYPE account_lifecycle_stage AS ENUM ('LEAD', 'MQL', 'SQL', 'ACTIVE', 'CHURNED');
CREATE TYPE account_billing_status AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIAL');
CREATE TYPE account_tier AS ENUM ('FREE', 'GROWTH', 'PRO', 'ENTREPRISE');
CREATE TYPE deal_stage AS ENUM ('QUALIFIED', 'DISCOVERY', 'DEMONSTRATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');
CREATE TYPE deal_type AS ENUM ('NEW', 'EXPANSION', 'RENEWAL', 'CHURN');
CREATE TYPE forecast_category AS ENUM ('PIPELINE', 'BEST_CASE', 'COMMIT', 'OMITTED');
CREATE TYPE activity_type AS ENUM ('EMAIL', 'CALL', 'MEETING', 'TASK', 'NOTE', 'WEB_VISIT', 'CUSTOM_EVENT');
CREATE TYPE activity_subtype AS ENUM ('SENT', 'RECEIVED', 'OPENED', 'CLICKED', 'REPLIED', 'COMPLETED', 'SCHEDULED');
CREATE type activity_status AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED');
CREATE type activity_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE type campaign_type AS ENUM ('EMAIL', 'SOCIAL', 'WEBINAR', 'EVENTS', 'CONTENT', 'PAID_MEDIA');
CREATE type campaign_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');
CREATE type campaign_member_status AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED', 'BOUNCED');
CREATE type support_ticket_status AS ENUM ('NEW', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE type support_ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE type support_ticket_type AS ENUM ('QUESTION', 'INCIDENT', 'PROBLEM', 'TASK');
CREATE type subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');
CREATE type billing_interval AS ENUM ('MONTHLY', 'YEARLY');
CREATE type invoice_status AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCREDITIBLE');
CREATE type event_category AS ENUM ('CRM', 'MARKETING', 'SALES', 'SUPPORT', 'BILLING');
CREATE type metric_period AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');
CREATE type metric_calculation AS ENUM ('SUM', 'AVG', 'COUNT', 'CUSTOM_FORMULA');
CREATE type insight_type AS ENUM ('RISK', 'OPPORTUNITY', 'TREND', 'ANOMALY');
CREATE type insight_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE type report_type AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');
CREATE type report_format AS ENUM ('PDF', 'PPTX', 'HTML', 'JSON');
CREATE type integration_provider AS ENUM ('SALESFORCE', 'HUBSPOT', 'OUTREACH', 'SALESLOFT', 'GONG', 'MARKETO', 'ZENDESK', 'FRESHDESK', 'STRIPE', 'CHARGEBEE', 'GMAIL', 'GOOGLE_CALENDAR', 'SLACK', 'TEAMS', 'GOOGLE_SHEETS');
CREATE type integration_status AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');
CREATE type auth_type AS ENUM ('OAUTH2', 'API_KEY', 'BASIC');
CREATE type sync_frequency AS ENUM ('REAL_TIME', 'HOURLY', 'DAILY');
CREATE type user_role AS ENUM ('ADMIN', 'SALES_REP', 'MARKETING', 'SUPPORT', 'VIEWER');
CREATE type rule_type AS ENUM ('FIELD_VALIDATION', 'BUSINESS_RULE', 'DATA_QUALITY');
CREATE type rule_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE type issue_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- Master customer table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status customer_status DEFAULT 'ACTIVE',
  plan TEXT DEFAULT 'professional', -- legacy field for compatibility
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Configuration and settings
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  time_format TEXT DEFAULT '24h',
  
  -- Account limits and quotas
  max_users INTEGER DEFAULT 10,
  max_integrations INTEGER DEFAULT 5,
  api_quota INTEGER DEFAULT 1000,
  
  -- Metadata
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  size TEXT,
  region TEXT,
  
  -- Audit fields
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1
);

-- Users table with enhanced role management
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN first_name IS NULL AND last_name IS NULL THEN email
      WHEN first_name IS NULL THEN last_name
      WHEN last_name IS NULL THEN first_name
      ELSE first_name || ' ' || last_name
    END
  ) STORED,
  role user_role DEFAULT 'SALES_REP',
  title TEXT,
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- External system mapping
  external_id TEXT,
  source_system TEXT,
  
  -- Preferences
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en-US',
  notification_preferences JSONB DEFAULT '{}',
  dashboard_preferences JSONB DEFAULT '{}',
  
  -- Status and access
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1,
  
  UNIQUE(customer_id, email)
);

-- Accounts (companies) with enhanced tracking
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id TEXT, -- Salesforce/HubSpot ID
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size_category account_size_category,
  arr DECIMAL(12,2),
  health_score INTEGER DEFAULT 50, -- 0-100
  lifecycle_stage account_lifecycle_stage DEFAULT 'LEAD',
  tier account_tier DEFAULT 'FREE',
  billing_status account_billing_status,
  owner_id UUID REFERENCES users(id),
  
  -- Rich data fields
  description TEXT,
  website TEXT,
  phone TEXT,
  address JSONB,
  social_links JSONB,
  tags TEXT[],
  
  -- Custom fields
  custom_fields JSONB DEFAULT '{}',
  
  -- Metadata
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1
);

-- Contacts (people) with engagement tracking
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  title TEXT,
  department TEXT,
  seniority_level TEXT, -- INDIVIDUAL, MANAGER, DIRECTOR, VP, C_LEVEL
  lead_source TEXT,
  
  -- Decision maker status
  is_decision_maker BOOLEAN DEFAULT FALSE,
  is_influencer BOOLEAN DEFAULT FALSE,
  is_champion BOOLEAN DEFAULT FALSE,
  is_blocker BOOLEAN DEFAULT FALSE,
  
  -- Communication preferences
  preferred_contact_method TEXT,
  communication_timezone TEXT,
  do_not_contact BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  linkedin_url TEXT,
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- System fields
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1,
  
  UNIQUE(customer_id, email) WHERE email IS NOT NULL
);

-- Deals (opportunities) with comprehensive tracking
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  stage deal_stage DEFAULT 'QUALIFIED',
  stage_changed_at TIMESTAMP WITH TIME ZONE,
  probability INTEGER DEFAULT 50, -- 0-100
  close_date DATE,
  created_date DATE DEFAULT CURRENT_DATE,
  owner_id UUID REFERENCES users(id),
  
  -- Deal categorization
  source TEXT, -- OUTBOUND, INBOUND, PARTNER, REFERRAL
  type deal_type DEFAULT 'NEW',
  campaign_id UUID REFERENCES campaigns(id),
  priority TEXT DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, CRITICAL
  forecast_category forecast_category DEFAULT 'PIPELINE',
  
  -- Health and scoring
  health_score INTEGER DEFAULT 50, -- 0-100
  risk_factors JSONB DEFAULT '[]',
  engagement_score INTEGER DEFAULT 50, -- 0-100
  
  -- Timeline metrics
  days_in_stage INTEGER DEFAULT 0,
  sales_cycle_days INTEGER DEFAULT 0,
  days_since_last_activity INTEGER DEFAULT 0,
  
  -- Competitive information
  competitor TEXT,
  competitor_strength TEXT, -- WEAK, AVERAGE, STRONG
  competitive_situation TEXT, -- WINNING, LOSING, NEUTRAL
  
  -- Process tracking
  next_step TEXT,
  next_step_due_date DATE,
  last_activity_date DATE,
  
  -- Custom data
  custom_fields JSONB DEFAULT '{}',
  product_details JSONB DEFAULT '{}', -- Products/services included
  pipeline_value DECIMAL(12,2), -- May differ from amount for multi-year deals
  
  -- Metadata
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1
);

-- Activities (all touchpoints across GTM systems)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id TEXT,
  type activity_type NOT NULL,
  subtype activity_subtype,
  subject TEXT,
  description TEXT,
  status activity_status DEFAULT 'COMPLETED',
  priority activity_priority DEFAULT 'MEDIUM',
  duration_minutes INTEGER,
  
  -- Rich activity data
  content TEXT, -- Email body, call transcript, meeting notes
  attachments JSONB DEFAULT '[]',
  participants JSONB DEFAULT '[]',
  follow_up_required BOOLEAN DEFAULT FALSE,
  
  -- Timing and scheduling
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Relationships
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id),
  
  -- Engagement metrics
  engagement_score INTEGER DEFAULT 5, -- 0-10
  sentiment_score DECIMAL(3,2), -- -1 to 1
  response_required BOOLEAN DEFAULT FALSE,
  
  -- AI-generated insights
  ai_insights JSONB DEFAULT '{}',
  key_points JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  
  -- System fields
  source_system TEXT,
  provider_specific JSONB DEFAULT '{}',
  raw_data JSONB,
  
  -- Audit fields
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1
);

-- Marketing campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type campaign_type DEFAULT 'EMAIL',
  status campaign_status DEFAULT 'DRAFT',
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  launched_at TIMESTAMP WITH TIME ZONE,
  
  -- Budget and performance
  budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  expected_roi DECIMAL(5,2),
  
  -- Audience configuration
  target_audience JSONB DEFAULT '{}',
  target_account_count INTEGER,
  target_contact_count INTEGER,
  
  -- Campaign content
  subject_line TEXT,
  body_content TEXT,
  assets JSONB DEFAULT '[]',
  templates JSONB DEFAULT '{}',
  
  -- Settings
  owner_id UUID REFERENCES users(id),
  team_id UUID,
  auto_schedule BOOLEAN DEFAULT FALSE,
  approval_status TEXT DEFAULT 'DRAFT',
  
  -- Performance tracking
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  
  -- Metadata
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  version INTEGER DEFAULT 1
);

-- Campaign member tracking
CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  
  status campaign_member_status DEFAULT 'SENT',
  
  -- Engagement tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  conversion_date DATE,
  
  -- Metrics
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  
  -- Performance
  conversion_value DECIMAL(10,2),
  campaign_cost DECIMAL(8,2),
  roi DECIMAL(5,2),
  
  -- System fields
  source_system TEXT,
  raw_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support tickets with customer success tracking
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Ticket information
  subject TEXT NOT NULL,
  description TEXT,
  status support_ticket_status DEFAULT 'NEW',
  priority support_ticket_priority DEFAULT 'MEDIUM',
  type support_ticket_type DEFAULT 'QUESTION',
  category TEXT,
  
  -- Assignment and workflow
  assigned_to_id UUID REFERENCES users(id),
  group_id UUID,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_to_id UUID REFERENCES users(id),
  
  -- Timeline tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Customer satisfaction
  satisfaction_score INTEGER, -- 1-5
  satisfaction_feedback TEXT,
  
  -- Performance metrics
  first_resolution_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  agent_work_time_minutes INTEGER,
  
  -- AI analysis
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 10),
  churn_risk_indicator BOOLEAN DEFAULT FALSE,
  recommended_action TEXT,
  
  -- Ticket content
  tags TEXT[],
  attachments JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  
  -- Source tracking
  source_channel TEXT, -- EMAIL, WEB, PHONE, SOCIAL
  source_reference TEXT,
  
  -- System fields
  source_system TEXT,
  raw_data JSONB,
  
  -- Audit fields
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Subscriptions with ARR tracking
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT,
  description TEXT,
  
  status subscription_status DEFAULT 'ACTIVE',
  plan_name TEXT,
  plan_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  billing_interval billing_interval DEFAULT 'MONTHLY',
  quantity INTEGER DEFAULT 1,
  
  -- Timeline
  started_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Revenue recognition
  recognized_revenue DECIMAL(12,2),
  arr_impact DECIMAL(12,2),
  net_revenue_retention DECIMAL(5,2),
  
  -- Product details
  product_id TEXT,
  product_category TEXT,
  features JSONB DEFAULT '[]',
  usage_limits JSONB DEFAULT '{}',
  
  -- System fields
  source_system TEXT,
  raw_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Invoices for revenue tracking
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  number TEXT,
  description TEXT,
  
  status invoice_status DEFAULT 'DRAFT',
  amount DECIMAL(10,2),
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- Dates and timeline
  issue_date DATE,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Payment processing
  payment_method TEXT,
  payment_reference TEXT,
  payment_processor TEXT,
  
  -- Line items
  line_items JSONB DEFAULT '[]', -- Array of invoice line items
  
  -- Dunning and collection
  collection_status TEXT,
  last_collection_attempt TIMESTAMP WITH TIME ZONE,
  collection_attempts INTEGER DEFAULT 0,
  
  -- System fields
  source_system TEXT,
  raw_data JSONB,
  
  -- Audit fields
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Events table for audit trail and change tracking
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type TEXT NOT NULL,
  event_category event_category,
  source_system TEXT NOT NULL,
  external_id TEXT,
  
  -- Entity information
  entity_type TEXT NOT NULL,
  entity_id UUID,
  
  -- Event data
  payload JSONB NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  
  -- Processing metadata
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number BIGSERIAL,
  batch_id UUID,
  processing_status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient querying
  index(customer_id, entity_type, entity_id),
  index(event_type, created_at),
  index(sequence_number)
);

-- Metrics for aggregations and analytics
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Metric identification
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_period metric_period DEFAULT 'MONTHLY',
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Metric values
  metric_value DECIMAL(15,2),
  metric_count INTEGER DEFAULT 0,
  metric_average DECIMAL(10,2),
  
  -- Dimensions and filters
  dimensions JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  
  -- Calculation metadata
  calculation_method metric_calculation DEFAULT 'SUM',
  calculation_config JSONB DEFAULT '{}',
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of parameters
  UNIQUE(customer_id, metric_type, metric_name, metric_period, period_start_date, dimensions)
);

-- AI insights and recommendations
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Insight classification
  insight_type insight_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity insight_severity DEFAULT 'MEDIUM',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  
  -- Context and targeting
  entity_type TEXT,
  entity_id UUID,
  time_period TEXT, -- LAST_7_DAYS, LAST_30_DAYS, CURRENT_QUARTER
  scope TEXT, -- INDIVIDUAL, ACCOUNT, TEAM, CUSTOMER-wide
  
  -- Content and recommendations
  recommendation TEXT,
  action_items JSONB DEFAULT '[]',
  supporting_data JSONB DEFAULT '{}',
  key_metrics JSONB DEFAULT '{}',
  
  -- AI processing metadata
  model_version TEXT,
  prompt_template TEXT,
  processing_time_ms INTEGER,
  token_count INTEGER,
  related_insights JSONB DEFAULT '[]', -- Array of related insight IDs
  
  -- Status and lifecycle
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED
  expires_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Report identification
  name TEXT NOT NULL,
  type report_type NOT NULL,
  template_id TEXT,
  description TEXT,
  
  -- Period and coverage
  period_start_date DATE,
  period_end_date DATE,
  
  -- Generated content
  content JSONB NOT NULL DEFAULT '{}',
  summary TEXT,
  key_insights JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  
  -- Formatting and output
  format_type report_format DEFAULT 'PDF',
  file_url TEXT, -- Storage location
  file_size INTEGER,
  file_checksum TEXT,
  
  -- Generation metadata
  generated_by TEXT DEFAULT 'SYSTEM', -- SYSTEM, USER, SCHEDULED
  generation_time_ms INTEGER,
  model_version TEXT,
  generation_config JSONB DEFAULT '{}',
  
  -- Delivery settings
  delivery_config JSONB DEFAULT '{}',
  delivery_status JSONB DEFAULT '{}',
  last_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Template and customization
  custom_sections JSONB DEFAULT '[]',
  branding_config JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Integration identification
  provider integration_provider NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Connection status
  status integration_status DEFAULT 'PENDING',
  connection_status TEXT, -- CONNECTED, DISCONNECTED, ERROR, EXPIRED
  
  -- Authentication configuration
  auth_type auth_type,
  configuration JSONB DEFAULT '{}',
  
  -- Secure storage (this should be encrypted at rest)
  credentials JSONB DEFAULT '{}',
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Sync configuration
  sync_frequency sync_frequency DEFAULT 'HOURLY',
  sync_config JSONB DEFAULT '{}',
  
  -- Performance tracking
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'PENDING',
  sync_error TEXT,
  events_processed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- Capabilities and configuration
  supported_events JSONB DEFAULT '[]',
  configured_events JSONB DEFAULT '[]',
  enabled_features JSONB DEFAULT '{}',
  
  -- Metadata
  logo_url TEXT,
  documentation_url TEXT,
  setup_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- CRM hygiene rules
CREATE TABLE hygiene_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  rule_type rule_type DEFAULT 'BUSINESS_RULE',
  severity rule_severity DEFAULT 'MEDIUM',
  entity_type TEXT NOT NULL,
  
  -- Rule definition
  condition JSONB NOT NULL,
  configuration JSONB DEFAULT '{}',
  
  -- Action configuration
  action JSONB NOT NULL,
  auto_fix BOOLEAN DEFAULT FALSE,
  auto_fix_confirm BOOLEAN DEFAULT FALSE,
  
  -- Rule execution
  is_active BOOLEAN DEFAULT TRUE,
  execution_frequency TEXT DEFAULT 'IMMEDIATE',
  schedule_config JSONB DEFAULT '{}',
  
  -- Performance tracking
  total_issues_detected INTEGER DEFAULT 0,
  total_auto_fixed INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Template and sharing
  is_template BOOLEAN DEFAULT FALSE,
  template_category TEXT,
  shared_with JSONB DEFAULT '[]', -- Array of customer IDs
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- CRM hygiene issues
CREATE TABLE hygiene_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  rule_id UUID REFERENCES hygiene_rules(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Issue details
  severity rule_severity DEFAULT 'MEDIUM',
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  
  - status and resolution
  status issue_status DEFAULT 'OPEN',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  
  -- Auto-fix tracking
  auto_fix_available BOOLEAN DEFAULT FALSE,
  auto_fix_attempted BOOLEAN DEFAULT FALSE,
  auto_fix_success BOOLEAN DEFAULT FALSE,
  auto_fix_error TEXT,
  auto_fix_at TIMESTAMP WITH TIME ZONE,
  auto_fix_result JSONB DEFAULT '{}',
  
  -- Issue context
  field_values JSONB DEFAULT '{}',
  validation_errors JSONB DEFAULT '[]',
  related_issues JSONB DEFAULT '[]', -- Array of related issue IDs
  
  -- Impact assessment
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  affected_deals JSONB DEFAULT '[]', -- Array of affected deal IDs
  financial_impact DECIMAL(12,2),
  
  -- Assignment and workflow
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create materialized views for performance optimization
CREATE MATERIALIZED VIEW pipeline_snapshot AS
SELECT 
  d.customer_id,
  d.stage,
  COUNT(*) as deal_count,
  SUM(COALESCE(d.amount, 0)) as total_amount,
  AVG(COALESCE(d.probability, 0)) as avg_probability,
  STRING_AGG(DISTINCT d.owner_id::text, ',') as owner_ids,
  MAX(d.updated_at) as last_updated,
  SUM(CASE WHEN d.days_in_stage > 30 THEN 1 ELSE 0 END) as stalled_deals_count
FROM deals d
WHERE d.deleted_at IS NULL
  AND d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')
  AND d.close_date >= CURRENT_DATE - INTERVAL '180 days'
GROUP BY d.customer_id, d.stage;

CREATE MATERIALIZED VIEW account_health_summary AS
SELECT 
  a.customer_id,
  a.id as account_id,
  a.name,
  a.health_score,
  a.lifecycle_stage,
  a.tier,
  COALESCE(a.arr, 0) as arr,
  COUNT(DISTINCT d.id) as active_deals,
  SUM(CASE WHEN d.deleted_at IS NULL AND d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST') THEN COALESCE(d.amount, 0) ELSE 0 END) as pipeline_amount,
  COUNT(DISTINCT st.id) as open_tickets,
  AVG(CASE WHEN st.satisfaction_score IS NOT NULL THEN st.satisfaction_score END) as avg_csat,
  MAX(d.last_activity_date) as last_deal_activity,
  MAX(a.updated_at) as last_updated
FROM accounts a
LEFT JOIN deals d ON a.id = d.account_id AND d.deleted_at IS NULL
LEFT JOIN support_tickets st ON a.id = st.account_id AND st.deleted_at IS NULL AND st.status IN ('NEW', 'IN_PROGRESS')
WHERE a.deleted_at IS NULL
GROUP BY a.customer_id, a.id, a.name, a.health_score, a.lifecycle_stage, a.tier, a.arr;

-- Create essential indexes for performance
-- Account-related indexes
CREATE INDEX idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX idx_accounts_external_id ON accounts(external_id);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_lifecycle_stage ON accounts(lifecycle_stage);
CREATE INDEX idx_accounts_health_score ON accounts(health_score);
CREATE INDEX idx_accounts_tier ON accounts(tier);
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin(name gin_trgm_ops);

-- Deal-related indexes
CREATE INDEX idx_deals_customer_id ON deals(customer_id);
CREATE INDEX idx_deals_account_id ON deals(account_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_close_date ON deals(close_date);
CREATE INDEX idx_deals_health_score ON deals(health_score);
CREATE INDEX idx_deals_amount ON deals(amount);
CREATE INDEX idx_deals_created_date ON deals(created_date);
CREATE INDEX idx_deals_stage_changed_at ON deals(stage_changed_at);

-- Contact-related indexes
CREATE INDEX idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_decision_maker ON contacts(is_decision_maker);
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin(first_name, last_name gin_trgm_ops);

-- Activity-related indexes
CREATE INDEX idx_activities_customer_id ON activities(customer_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_activity_date ON activities(activity_date);
CREATE INDEX idx_activities_engagement_score ON activities(engagement_score);
CREATE INDEX idx_activities_source_system ON activities(source_system);

-- Campaign-related indexes
CREATE INDEX idx_campaigns_customer_id ON campaigns(customer_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_owner_id ON campaigns(owner_id);

-- Event-related indexes for high-velocity data
CREATE INDEX idx_events_customer_id ON events(customer_id);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_sequence_number ON events(sequence_number);
CREATE INDEX idx_events_batch_id ON events(batch_id);

-- Metrics and analysis indexes
CREATE INDEX idx_metrics_customer_id ON metrics(customer_id);
CREATE INDEX idx_metrics_period ON metrics(metric_period, period_start_date);
CREATE INDEX idx_metrics_unique ON metrics(customer_id, metric_type, metric_name, metric_period, period_start_date, dimensions);
CREATE INDEX idx_metrics_metric_type ON metrics(metric_type);

-- AI insights indexes
CREATE INDEX idx_ai_insights_customer_id ON ai_insights(customer_id);
CREATE INDEX idx_ai_insights_entity ON ai_insights(entity_type, entity_id);
CREATE INDEX idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at);

-- Integration indexes
CREATE INDEX idx_integrations_customer_id ON integrations(customer_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_status ON integrations(status);

-- User indexes
CREATE INDEX idx_users_customer_id ON users(customer_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Hygiene-related indexes
CREATE INDEX idx_hygiene_issues_customer_id ON hygiene_issues(customer_id);
CREATE INDEX idx_hygiene_issues_entity ON hygiene_issues(entity_type, entity_id);
CREATE INDEX idx_hygiene_issues_status ON hygiene_issues(status);
CREATE INDEX idx_hygiene_issues_severity ON hygiene_issues(severity);
CREATE INDEX idx_hygiene_issues_detected_at ON hygiene_issues(detected_at);

-- Enable row level security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_issues ENABLE ROW LEVEL SECURITY;

-- Create functions for materialized view refresh
CREATE OR REPLACE FUNCTION refresh_pipeline_snapshot()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_snapshot;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error refreshing pipeline_snapshot: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_account_health_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY account_health_summary;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error refreshing account_health_summary: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Trigger functions for change tracking
CREATE OR REPLACE FUNCTION log_entity_changes()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO events (
            customer_id,
            event_type,
            event_category,
            source_system,
            entity_type,
            entity_id,
            payload,
            created_at
        ) VALUES (
            COALESCE(OLD.customer_id, 'system'),
            TG_TABLE_NAME || '.deleted',
            CASE 
                WHEN TG_TABLE_NAME IN ('deals', 'accounts', 'contacts') THEN 'CRM'
                WHEN TG_TABLE_NAME IN ('campaigns', 'campaign_members') THEN 'MARKETING'
                WHEN TG_TABLE_NAME IN ('support_tickets') THEN 'SUPPORT'
                WHEN TG_TABLE_NAME IN ('subscriptions', 'invoices') THEN 'BILLING'
                ELSE 'SYSTEM'
            END,
            'REVOPS_PLATFORM',
            TG_TABLE_NAME,
            OLD.id,
            json_build_object('old_data', to_jsonb(OLD), 'operation', TG_OP),
            NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if significant changes occurred
        IF to_jsonb(OLD) != to_jsonb(NEW) THEN
            INSERT INTO events (
                customer_id,
                event_type,
                event_category,
                source_system,
                entity_type,
                entity_id,
                payload,
                previous_state,
                new_state,
                created_at
            ) VALUES (
                COALESCE(NEW.customer_id, OLD.customer_id, 'system'),
                TG_TABLE_NAME || '.updated',
                CASE 
                    WHEN TG_TABLE_NAME IN ('deals', 'accounts', 'contacts') THEN 'CRM'
                    WHEN TG_TABLE_NAME IN ('campaigns', 'campaign_members') THEN 'MARKETING'
                    WHEN TG_TABLE_NAME IN ('support_tickets') THEN 'SUPPORT'
                    WHEN TG_TABLE_NAME IN ('subscriptions', 'invoices') THEN 'BILLING'
                    ELSE 'SYSTEM'
                END,
                'REVOPS_PLATFORM',
                TG_TABLE_NAME,
                NEW.id,
                json_build_object('changes', 
                    CASE 
                        WHEN TG_TABLE_NAME = 'deals' THEN 
                            json_build_object(
                                'amount', CASE WHEN OLD.amount IS DISTINCT FROM NEW.amount THEN NEW.amount ELSE NULL END,
                                'stage', CASE WHEN OLD.stage IS DISTINCT FROM NEW.stage THEN NEW.stage ELSE NULL END,
                                'probability', CASE WHEN OLD.probability IS DISTINCT FROM NEW.probability THEN NEW.probability ELSE NULL END,
                                'close_date', CASE WHEN OLD.close_date IS DISTINCT FROM NEW.close_date THEN NEW.close_date ELSE NULL END
                            )
                        ELSE NULL
                    END
                ),
                to_jsonb(OLD),
                to_jsonb(NEW),
                NOW()
            );
        END IF;
        RETURN NEW;
    ELSE
        INSERT INTO events (
            customer_id,
            event_type,
            event_category,
            source_system,
            entity_type,
            entity_id,
            payload,
            new_state,
            created_at
        ) VALUES (
            COALESCE(NEW.customer_id, 'system'),
            TG_TABLE_NAME || '.created',
            CASE 
                WHEN TG_TABLE_NAME IN ('deals', 'accounts', 'contacts') THEN 'CRM'
                WHEN TG_TABLE_NAME IN ('campaigns', 'campaign_members') THEN 'MARKETING'
                WHEN TG_TABLE_NAME IN ('support_tickets') THEN 'SUPPORT'
                WHEN TG_TABLE_NAME IN ('subscriptions', 'invoices') THEN 'BILLING'
                ELSE 'SYSTEM'
            END,
            'REVOPS_PLATFORM',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW),
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for main tables that need change logging
CREATE TRIGGER accounts_entity_changes
    AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

CREATE TRIGGER deals_entity_changes
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

CREATE TRIGGER contacts_entity_changes
    AFTER INSERT OR UPDATE OR DELETE ON contacts
    FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

CREATE TRIGGER activities_entity_changes
    AFTER INSERT OR UPDATE OR DELETE ON activities
    FOR EACH ROW EXECUTE FUNCTION log_entity_changes();

-- Create refresh schedule for materialized views
DO $$
BEGIN
    -- Refresh pipeline snapshot every 5 minutes
    IF NOT EXISTS (
        SELECT 1 FROM pg_cron.job 
        WHERE jobname = 'refresh_pipeline_snapshot'
    ) THEN
        PERFORM cron.schedule('refresh_pipeline_snapshot', '*/5 * * * *', 'SELECT refresh_pipeline_snapshot();');
    END IF;
    
    -- Refresh account health summary every 10 minutes
    IF NOT EXISTS (
        SELECT 1 FROM pg_cron.job 
        WHERE jobname = 'refresh_account_health_summary'
    ) THEN
        PERFORM cron.schedule('refresh_account_health_summary', '*/10 * * * *', 'SELECT refresh_account_health_summary();');
    END IF;
END
$$;

-- Insert default system user for system-generated events
INSERT INTO users (id, customer_id, email, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'system@revops.platform',
    'System User',
    'ADMIN',
    true
) ON CONFLICT (id) DO NOTHING;
