import { getLogger } from '../utils/logger';
import { ERROR_CODES, HTTP_STATUS_CODES, INTEGRATION_PROVIDER, INTEGRATION_STATUS, AUTH_TYPE } from '../constants';
import { APIError } from '../api/middleware';
import { z } from 'zod';

const logger = getLogger('integration-manager');

export interface IntegrationConfig {
  provider: INTEGRATION_PROVIDER;
  name: string;
  description: string;
  authType: AUTH_TYPE;
  capabilities: string[];
  webhookEvents: string[];
  syncEndpoints: string[];
  authUrl?: string;
  tokenUrl?: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    concurrencyLimit: number;
  };
  fieldMappings: Record<string, Record<string, string>>;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
}

export interface APIConfig {
  apiKey: string;
  baseUrl: string;
  headers?: Record<string, string>;
  authType?: API_KEY_TYPE;
}

export enum API_KEY_TYPE {
  HEADER = 'header',
  QUERY = 'query',
  BASIC = 'basic',
}

export interface AuthenticatedIntegration {
  id: string;
  customerId: string;
  provider: INTEGRATION_PROVIDER;
  status: INTEGRATION_STATUS;
  createdAt: string;
  lastSyncAt?: string;
  configuration: Record<string, any>;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    expiresAt?: number;
  };
}

export interface WebhookEvent {
  provider: INTEGRATION_PROVIDER;
  eventType: string;
  payload: any;
  timestamp: string;
  signature?: string;
  headers: Record<string, string>;
}

export interface NormalizedEvent {
  eventType: string;
  entityType: string;
  entityId: string;
  customerId: string;
  payload: any;
  previousState?: any;
  metadata: {
    source: string;
    timestamp: string;
    context: Record<string, any>;
  };
}

// Integration configurations for each provider
const INTEGRATION_CONFIGS: Record<INTEGRATION_PROVIDER, IntegrationConfig> = {
  [INTEGRATION_PROVIDER.SALESFORCE]: {
    provider: INTEGRATION_PROVIDER.SALESFORCE,
    name: 'Salesforce',
    description: 'Connect your Salesforce CRM for deals, accounts, and contacts',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['deals', 'accounts', 'contacts', 'activities'],
    webhookEvents: [
      'Opportunity.CREATED',
      'Opportunity.UPDATED',
      'Opportunity.DELETED',
      'Account.CREATED',
      'Account.UPDATED',
      'Account.DELETED',
      'Contact.CREATED',
      'Contact.UPDATED',
      'Contact.DELETED',
      'Task.CREATED',
      'Task.UPDATED',
      'Task.DELETED',
      'Event.CREATED',
      'Event.UPDATED',
      'Event.DELETED',
    ],
    syncEndpoints: [
      '/services/data/v58.0/sobjects/Opportunity',
      '/services/data/v58.0/sobjects/Account',
      '/services/data/v58.0/sobjects/Contact',
      '/services/data/v58.0/sobjects/Task',
      '/services/data/v58.0/sobjects/Event',
    ],
    rateLimits: {
      requestsPerMinute: 15000,
      requestsPerHour: 900000,
      concurrencyLimit: 25,
    },
    fieldMappings: {
      deal: {
        'Amount': 'amount',
        'StageName': 'stage',
        'CloseDate': 'closeDate',
        'Probability': 'probability',
        'LeadSource': 'source',
        'Type': 'dealType',
        'ForecastCategory': 'forecastCategory',
        'Description': 'description',
        'Account.Name': 'accountName',
        'Owner.Name': 'ownerName',
      },
      account: {
        'Name': 'name',
        'Industry': 'industry',
        'AnnualRevenue': 'arr',
        'Type': 'accountType',
        'BillingCity': 'city',
        'BillingCountry': 'country',
        'Phone': 'phone',
        'Website': 'website',
      },
      contact: {
        'FirstName': 'firstName',
        'LastName': 'lastName',
        'Email': 'email',
        'Phone': 'phone',
        'Title': 'title',
        'Department': 'department',
        'Account.Name': 'accountName',
      },
      activity: {
        'ActivityDate': 'activityDate',
        'Subject': 'subject',
        'Description': 'description',
        'Status': 'status',
        'Priority': 'priority',
        'Type': 'type',
        'CallDurationInSeconds': 'duration',
      },
    },
  },

  [INTEGRATION_PROVIDER.HUBSPOT]: {
    provider: INTEGRATION_PROVIDER.HUBSPOT,
    name: 'HubSpot',
    description: 'Connect your HubSpot CRM, marketing, and support tools',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['deals', 'accounts', 'contacts', 'campaigns', 'activities'],
    webhookEvents: [
      'deal.creation',
      'deal.deletion',
      'deal.propertyChange',
      'company.creation',
      'company.deletion',
      'company.propertyChange',
      'contact.creation',
      'contact.deletion',
      'contact.propertyChange',
      'conversation.creation',
      'conversation.creation',
      'communication_interaction',
    ],
    syncEndpoints: [
      '/crm/v3/objects/deals',
      '/crm/v3/objects/companies',
      '/crm/v3/objects/contacts',
      '/marketing/v3/campaigns',
      '/conversations/v3/conversations',
    ],
    rateLimits: {
      requestsPerMinute: 300,
      requestsPerHour: 18000,
      concurrencyLimit: 10,
    },
    fieldMappings: {
      deal: {
        'amount': 'amount',
        'dealstage': 'stage',
        'closedate': 'closeDate',
        'pipeline': 'pipelineName',
        'dealname': 'name',
        'dealtype': 'dealType',
        'description': 'description',
        'hs_associated_companyid': 'accountId',
        'hubspot_owner_id': 'ownerId',
      },
      account: {
        'name': 'name',
        'industry': 'industry',
        'annualrevenue': 'arr',
        'city': 'city',
        'country': 'country',
        'phone': 'phone',
        'website': 'website',
      },
      contact: {
        'firstname': 'firstName',
        'lastname': 'lastName',
        'email': 'email',
        'phone': 'phone',
        'jobtitle': 'title',
        'hs_associated_companyid': 'accountId',
      },
      activity: {
        'hs_timestamp': 'activityDate',
        'hs_communication_channel_type': 'type',
        'hs_body_preview': 'subject',
        'hs_communication_body': 'description',
        'hs_object_source': 'source',
      },
    },
  },

  [INTEGRATION_PROVIDER.GONG]: {
    provider: INTEGRATION_PROVIDER.GONG,
    name: 'Gong',
    description: 'Connect Gong for conversation intelligence and sales insights',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['activities', 'insights'],
    webhookEvents: [
      'call.created',
      'call.transcript.completed',
      'call.analysis.completed',
    ],
    syncEndpoints: [
      '/v2/calls',
      '/v2/calls/transcript',
      '/v2/calls/analysis',
    ],
    rateLimits: {
      requestsPerMinute: 1000,
      requestsPerHour: 60000,
      concurrencyLimit: 5,
    },
    fieldMappings: {
      activity: {
        'id': 'externalId',
        'title': 'subject',
        'startsAt': 'activityDate',
        'duration': 'duration',
        'participants': 'participants',
        'transcript': 'content',
        'sentiment': 'sentimentScore',
        'summary': 'aiInsights.analysis_summary',
      },
    },
  },

  [INTEGRATION_PROVIDER.STRIPE]: {
    provider: INTEGRATION_PROVIDER.STRIPE,
    name: 'Stripe',
    description: 'Connect Stripe for billing and revenue data',
    authType: AUTH_TYPE.API_KEY,
    capabilities: ['billing'],
    webhookEvents: [
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'invoice.created',
      'customer.created',
      'customer.updated',
      'subscription.created',
      'subscription.updated',
      'subscription.cancelled',
    ],
    syncEndpoints: [
      '/v1/invoices',
      '/v1/customers',
      '/v1/subscriptions',
      '/v1/charges',
    ],
    rateLimits: {
      requestsPerMinute: 90,
      requestsPerHour: 5400,
      concurrencyLimit: 3,
    },
    fieldMappings: {
      invoice: {
        'id': 'externalId',
        'number': 'number',
        'created': 'createdAt',
        'due_date': 'dueDate',
        'amount': 'total',
        'currency': 'currency',
        'status': 'status',
        'customer': 'customerId',
        'metadata': 'customFields',
      },
      subscription: {
        'id': 'externalId',
        'created': 'startedAt',
        'current_period_start': 'currentPeriodStart',
        'current_period_end': 'currentPeriodEnd',
        'trial_end': 'trialEndsAt',
        'canceled_at': 'canceledAt',
        'plan': 'planName',
        'quantity': 'quantity',
        'items': 'productDetails',
        'status': 'status',
        'customer': 'customerId',
      },
    },
  },

  [INTEGRATION_PROVIDER.OUTREACH]: {
    provider: INTEGRATION_PROVIDER.OUTREACH,
    name: 'Outreach',
    description: 'Connect Outreach for sales engagement and sequencing',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['sequences', 'prospects', 'activities'],
    webhookEvents: [
      'sequence.started',
      'sequence.completed',
      'prospect.created',
      'prospect.updated',
      'email.replied',
      'call.completed',
    ],
    syncEndpoints: [
      '/v1/sequences',
      '/v1/prospects',
      '/v1/activities',
    ],
    rateLimits: {
      requestsPerMinute: 600,
      requestsPerHour: 36000,
      concurrencyLimit: 100,
    },
    fieldMappings: {
      sequence: {
        'id': 'externalId',
        'name': 'title',
        'created': 'createdAt',
        'state': 'status',
        'bounces': 'bounceCount',
        'opens': 'openCount',
        'clicks': 'clickCount',
        'replies': 'replyCount',
      },
    },
  },

  [INTEGRATION_PROVIDER.SALESLOFT]: {
    provider: INTEGRATION_PROVIDER.SALESLOFT,
    name: 'Salesloft',
    description: 'Connect Salesloft for sales engagement and analytics',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['cadences', 'people', 'activities', 'analytics'],
    webhookEvents: [
      'call.created',
      'email.sent',
      'email.opened',
      'email.replied',
      'meeting.created',
    ],
    syncEndpoints: [
      '/v1/cadences',
      '/v1/people',
      '/v1/call_activities',
      '/v1/email_activities',
    ],
    rateLimits: {
      requestsPerMinute: 300,
      requestsPerHour: 18000,
      concurrencyLimit: 50,
    },
    fieldMappings: {
      cadence: {
        'id': 'externalId',
        'name': 'title',
        'created': 'createdAt',
        'user': 'ownerId',
        'success_rate': 'successRate',
      },
    },
  },

  [INTEGRATION_PROVIDER.ZENDESK]: {
    provider: INTEGRATION_PROVIDER.ZENDESK,
    name: 'Zendesk',
    description: 'Connect Zendesk for customer support and tickets',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['tickets', 'articles', 'webhooks'],
    webhookEvents: [
      'ticket.created',
      'ticket.updated',
      'ticket.deleted',
      'comment.created',
      'article.created',
    ],
    syncEndpoints: [
      '/api/v2/tickets',
      '/api/v2/articles',
      '/api/v2/users',
    ],
    rateLimits: {
      requestsPerMinute: 700,
      requestsPerHour: 42000,
      concurrencyLimit: 50,
    },
    fieldMappings: {
      ticket: {
        'id': 'externalId',
        'subject': 'title',
        'description': 'content',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'status': 'status',
        'priority': 'priority',
        'requester_id': 'ownerId',
      },
    },
  },

  [INTEGRATION_PROVIDER.SLACK]: {
    provider: INTEGRATION_PROVIDER.SLACK,
    name: 'Slack',
    description: 'Connect Slack for team communication and notifications',
    authType: AUTH_TYPE.OAUTH2,
    capabilities: ['messages', 'channels', 'users'],
    webhookEvents: [
      'message.created',
      'channel.created',
      'team.join',
      'app_mention',
    ],
    syncEndpoints: [
      '/api/conversations.list',
      '/api/users.list',
      '/api/messages.history',
    ],
    rateLimits: {
      requestsPerMinute: 200,
      requestsPerHour: 12000,
      concurrencyLimit: 20,
    },
    fieldMappings: {
      message: {
        'ts': 'externalId',
        'text': 'content',
        'user': 'authorId',
        'channel': 'channelId',
        'team': 'teamId',
        'timestamp': 'createdAt',
      },
    },
  },
};

export class IntegrationManager {
  private static instance: IntegrationManager;
  private connections: Map<string, AuthenticatedIntegration> = new Map();
  private normalizers: Map<INTEGRATION_PROVIDER, EventNormalizer> = new Map();

  private constructor() {
    this.initializeNormalizers();
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  private initializeNormalizers(): void {
    this.normalizers.set(INTEGRATION_PROVIDER.SALESFORCE, new SalesforceNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.HUBSPOT, new HubSpotNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.GONG, new GongNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.STRIPE, new StripeNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.OUTREACH, new OutreachNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.SALESLOFT, new SalesloftNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.ZENDESK, new ZendeskNormalizer());
    this.normalizers.set(INTEGRATION_PROVIDER.SLACK, new SlackNormalizer());
  }

  // Get available integrations
  getAvailableIntegrations(): IntegrationConfig[] {
    return Object.values(INTEGRATION_CONFIGS);
  }

  // Get specific integration config
  getIntegrationConfig(provider: INTEGRATION_PROVIDER): IntegrationConfig {
    const config = INTEGRATION_CONFIGS[provider];
    if (!config) {
      throw new APIError(
        'INTEGRATION_ERROR',
        `Unknown integration provider: ${provider}`,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    return config;
  }

  // Initialize OAuth flow
  async initializeOAuth(
    provider: INTEGRATION_PROVIDER,
    customerId: string,
    redirectUri?: string
  ): Promise<OAuthInit> {
    const config = this.getIntegrationConfig(provider);
    
    if (config.authType !== AUTH_TYPE.OAUTH2) {
      throw new APIError(
        'INTEGRATION_ERROR',
        `${provider} does not support OAuth authentication`,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    // Generate secure state parameter
    const state = crypto.randomUUID();
    const expiresAt = Date.now() + 600000; // 10 minutes

    // Store state in cache (would use Redis in production)
    const oauthState = {
      provider,
      customerId,
      state,
      expiresAt,
      redirectUri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/${provider}/callback`,
    };

    // This would normally be stored in Redis
    logger.info('OAuth flow initiated', {
      provider,
      customerId,
      state,
      expiresAt,
    });

    // Build auth URL
    const authUrl = this.buildAuthUrl(config, oauthState);

    return {
      authUrl,
      state,
      expiresAt: new Date(expiresAt).toISOString(),
      provider,
    };
  }

  // Handle OAuth callback
  async handleOAuthCallback(
    provider: INTEGRATION_PROVIDER,
    code: string,
    state: string,
    error?: string
  ): Promise<OAuthCallbackResult> {
    if (error) {
      logger.error('OAuth callback error', { provider, error });
      throw new APIError(
        'INTEGRATION_ERROR',
        `OAuth authentication failed: ${error}`,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate and retrieve stored state
    const storedState = await this.getOAuthState(state);
    if (!storedState || storedState.expiresAt < Date.now()) {
      throw new APIError(
        'INTEGRATION_ERROR',
        'Invalid or expired OAuth state',
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(provider, code, storedState);

    // Store the authenticated integration
    const integration = await this.storeAuthenticatedIntegration(
      provider,
      storedState.customerId,
      tokens
    );

    // Schedule initial data sync
    this.scheduleInitialSync(integration.id);

    return {
      success: true,
      integrationId: integration.id,
      provider,
      customerId: storedState.customerId,
    };
  }

  // Store authenticated integration
  private async storeAuthenticatedIntegration(
    provider: INTEGRATION_PROVIDER,
    customerId: string,
    tokens: OAuthTokens
  ): Promise<AuthenticatedIntegration> {
    const integrationId = crypto.randomUUID();
    
    const integration: AuthenticatedIntegration = {
      id: integrationId,
      customerId,
      provider,
      status: INTEGRATION_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      configuration: {
        scopes: tokens.scope?.split(' ') || [],
      },
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      },
    };

    // Store in database
    // This would be saved to the integrations table
    this.connections.set(integrationId, integration);

    logger.info('Integration stored', {
      integrationId,
      provider,
      customerId,
    });

    return integration;
  }

  // Process webhook events
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    const config = this.getIntegrationConfig(event.provider);
    
    // Validate webhook signature
    if (!this.validateWebhookSignature(event.provider, event)) {
      throw new APIError(
        'WEBHOOK_VERIFICATION_FAILED',
        'Invalid webhook signature',
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }

    // Get normalizer for provider
    const normalizer = this.normalizers.get(event.provider);
    if (!normalizer) {
      logger.warn('No normalizer found for provider', { provider: event.provider });
      return;
    }

    try {
      // Normalize the event
      const normalized = await normalizer.normalize(event);
      
      // Queue for processing
      await this.queueEventProcessing(normalized);
      
      logger.integrationEvent(event.provider, 'webhook_received', {
        eventType: event.eventType,
        entityId: normalized.entityId,
        customerId: normalized.customerId,
      });
      
    } catch (error) {
      logger.error('Failed to process webhook event', {
        error,
        provider: event.provider,
        eventType: event.eventType,
      });
      throw error;
    }
  }

  // Get API client for authenticated integration
  async getAPIClient(integrationId: string): Promise<APIClient> {
    const integration = this.connections.get(integrationId);
    
    if (!integration) {
      throw new APIError(
        'INTEGRATION_ERROR',
        'Integration not found',
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }

    // Check if tokens need refresh
    if (integration.credentials.accessToken && 
        integration.credentials.expiresAt && 
        integration.credentials.expiresAt < Date.now()) {
      await this.refreshTokens(integration);
    }

    return new APIClient(integration);
  }

  // Refresh access tokens
  async refreshTokens(integration: AuthenticatedIntegration): Promise<OAuthTokens> {
    if (!integration.credentials.refreshToken) {
      throw new APIError(
        'INTEGRATION_ERROR',
        'No refresh token available for integration',
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }

    // Make token refresh request
    const config = INTEGRATION_CONFIGS[integration.provider];
    const tokenUrl = config.tokenUrl || `https://api.${integration.provider.toLowerCase()}.com/oauth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.credentials.refreshToken,
        client_id: process.env[`${integration.provider.toUpperCase()}_CLIENT_ID`] || '',
        client_secret: process.env[`${integration.provider.toUpperCase()}_CLIENT_SECRET`] || '',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    
    const tokens: OAuthTokens = await response.json();
    
    // Update stored tokens
    integration.credentials.accessToken = tokens.access_token;
    integration.credentials.refreshToken = tokens.refresh_token || integration.credentials.refreshToken;
    integration.credentials.expiresAt = tokens.expires_in ? 
      Date.now() + tokens.expires_in * 1000 : undefined;

    // Update in database
    this.connections.set(integration.id, integration);

    logger.info('Tokens refreshed', {
      integrationId: integration.id,
      provider: integration.provider,
    });
    
    return tokens;
  }

  private buildAuthUrl(config: IntegrationConfig, state: OAuthState): string {
    // This would build the OAuth URL based on provider-specific requirements
    const authUrl = config.authUrl || `https://api.${config.provider.toLowerCase()}.com/oauth/authorize`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: state.clientId || process.env[`${config.provider.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: state.redirectUri,
      scope: config.webhookEvents.join(' '), // OAuth scopes
      state: state.state,
    });
    return authUrl + '?' + params.toString();
  }

  private async exchangeCodeForTokens(provider: string, code: string, state: OAuthState): Promise<OAuthTokens> {
    // Implementation would vary by provider
    // This is a simplified example
    const config = INTEGRATION_CONFIGS[provider as INTEGRATION_PROVIDER];
    
    // Make token exchange request
    // This would use fetch or axios
    const response = await fetch(config.tokenUrl || `https://api.${config.provider.toLowerCase()}.com/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
        client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '',
        redirect_uri: state.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return response.json();
  }

  private validateWebhookSignature(provider: string, event: WebhookEvent): boolean {
    // Implementation would validate webhook signatures based on provider requirements
    // Salesforce: HMAC-SHA256
    // HubSpot: HMAC-SHA256
    // Gong: JWT
    // Stripe: Webhook signing secret
    
    // For now, return true (but implement properly in production)
    return true;
  }

  private async getOAuthState(state: string): Promise<OAuthState | null> {
    // This would retrieve the stored state from Redis
    // For now, return a mock implementation
    return {
      provider: 'SALESFORCE',
      customerId: 'test-customer',
      state,
      expiresAt: Date.now() + 600000,
      redirectUri: 'http://localhost:3000/api/v1/callback',
    };
  }

  private async queueEventProcessing(event: NormalizedEvent): Promise<void> {
    // This would add the event to Bull queue for processing
    logger.info('Event queued for processing', {
      eventType: event.eventType,
      entityId: event.entityId,
      customerId: event.customerId,
    });
  }

  private async scheduleInitialSync(integrationId: string): Promise<void> {
    // This would schedule an initial data sync job
    logger.info('Initial sync scheduled', { integrationId });
  }
}

// Event normalizer interface and implementations
interface EventNormalizer {
  normalize(event: WebhookEvent): Promise<NormalizedEvent>;
}

class SalesforceNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    // Implementation for Salesforce event normalization
    const { objectType, action, object } = event.payload;
    
    return {
      eventType: `${objectType.toLowerCase()}.${action.toLowerCase()}`,
      entityType: this.mapEntityType(objectType),
      entityId: object.Id,
      customerId: object.CustomerId__c, // Custom field on Salesforce objects
      payload: this.mapFields(objectType, object),
      metadata: {
        source: 'salesforce',
        timestamp: event.timestamp,
        context: {
          sourceSystem: event.provider,
          recordTypeId: object.RecordTypeId,
        },
      },
    };
  }

  private mapEntityType(sobject: string): string {
    const mapping = {
      'Opportunity': 'DEAL',
      'Account': 'ACCOUNT',
      'Contact': 'CONTACT',
      'Task': 'ACTIVITY',
      'Event': 'ACTIVITY',
    };
    return mapping[sobject as keyof typeof mapping] || sobject.toUpperCase();
  }

  private mapFields(sobject: string, data: any): any {
    const config = INTEGRATION_CONFIGS[INTEGRATION_PROVIDER.SALESFORCE];
    const mapping = config.fieldMappings[sobject.toLowerCase() as keyof typeof config.fieldMappings] || {};
    
    const mapped: any = {};
    for (const [source, target] of Object.entries(mapping)) {
      mapped[target] = data[source];
    }
    return mapped;
  }
}

class HubSpotNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    // Implementation for HubSpot event normalization
    const { subscriptionType, objectId, properties } = event.payload;
    
    return {
      eventType: subscriptionType,
      entityType: this.mapEntityType(subscriptionType),
      entityId: objectId,
      customerId: properties.hs_customer_id || properties.associated_company_id,
      payload: this.mapProperties(properties),
      metadata: {
        source: 'hubspot',
        timestamp: event.timestamp,
        context: {
          portalId: event.headers['x-hubspot-signature'],
        },
      },
    };
  }

  private mapEntityType(eventType: string): string {
    if (eventType.includes('deal')) return 'DEAL';
    if (eventType.includes('company')) return 'ACCOUNT';
    if (eventType.includes('contact')) return 'CONTACT';
    if (eventType.includes('conversation')) return 'ACTIVITY';
    return 'UNKNOWN';
  }

  private mapProperties(properties: Record<string, any>): any {
    // Map HubSpot properties to canonical format
    return {
      ...properties,
      amount: parseFloat(properties.amount) || 0,
      closeDate: properties.closedate ? new Date(properties.closedate).toISOString() : null,
    };
  }
}

class GongNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    // Implementation for Gong event normalization
    return {
      eventType: event.eventType,
      entityType: 'ACTIVITY',
      entityId: event.payload.id,
      customerId: event.payload.customerId, // Would need mapping
      payload: {
        externalId: event.payload.id,
        type: 'CALL',
        subject: event.payload.title,
        activityDate: new Date(event.payload.startsAt).toISOString(),
        duration: event.payload.duration / 60, // Convert to minutes
        content: event.payload.transcript?.text,
        participants: event.payload.participants?.map((p: any) => ({
          name: p.name,
          email: p.email,
          role: p.speakerStats?.speakingTime ? 'PARTICIPANT' : 'LISTENER',
        })),
        aiInsights: {
          sentiment: event.payload.analysis?.sentiment,
          summary: event.payload.analysis?.summary,
          keyTopics: event.payload.analysis?.topics,
        },
      },
      metadata: {
        source: 'gong',
        timestamp: event.timestamp,
        context: {
          recordingUrl: event.payload.recordingUrl,
        },
      },
    };
  }
}

class StripeNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    // Implementation for Stripe event normalization
    const { type, data } = event.payload;
    const object = data.object;
    
    let entityType = 'UNKNOWN';
    if (type.includes('invoice')) entityType = 'INVOICE';
    if (type.includes('subscription')) entityType = 'SUBSCRIPTION';
    if (type.includes('customer')) entityType = 'CUSTOMER';
    
    return {
      eventType: type,
      entityType,
      entityId: object.id,
      customerId: object.customer, // Stripe customer ID would map to our customer
      payload: mapStripeObject(entityType, object),
      metadata: {
        source: 'stripe',
        timestamp: event.timestamp,
        context: {
          account: event.headers['stripe-account'],
        },
      },
    };
  }
}

class OutreachNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    return {
      eventType: event.eventType,
      entityType: this.mapEntityType(event.eventType),
      entityId: event.payload.id,
      customerId: event.payload.Prospect?.accountId, // Would need mapping
      payload: {
        externalId: event.payload.id,
        title: event.payload.name,
        content: event.payload.description,
        owner: event.payload.owner?.email,
        metadata: event.payload,
      },
      metadata: {
        source: 'outreach',
        timestamp: event.timestamp,
        context: {
          provider: 'outreach',
          webhookId: event.payload.id,
        },
      },
    };
  }

  private mapEntityType(eventType: string): string {
    if (eventType.includes('sequence')) return 'ACTIVITY';
    if (eventType.includes('prospect')) return 'CONTACT';
    if (eventType.includes('email')) return 'ACTIVITY';
    if (eventType.includes('call')) return 'ACTIVITY';
    return 'UNKNOWN';
  }
}

class SalesloftNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    return {
      eventType: event.eventType,
      entityType: this.mapEntityType(event.eventType),
      entityId: event.payload.id,
      customerId: event.payload.person?.accountId, // Would need mapping
      payload: {
        externalId: event.payload.id,
        title: event.payload.name,
        content: event.payload.description,
        owner: event.payload.user?.email,
        metadata: event.payload,
      },
      metadata: {
        source: 'salesloft',
        timestamp: event.timestamp,
        context: {
          provider: 'salesloft',
          webhookId: event.payload.id,
        },
      },
    };
  }

  private mapEntityType(eventType: string): string {
    if (eventType.includes('cadence')) return 'ACTIVITY';
    if (eventType.includes('person')) return 'CONTACT';
    if (eventType.includes('email')) return 'ACTIVITY';
    if (eventType.includes('call')) return 'ACTIVITY';
    if (eventType.includes('meeting')) return 'ACTIVITY';
    return 'UNKNOWN';
  }
}

class ZendeskNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    return {
      eventType: event.eventType,
      entityType: this.mapEntityType(event.eventType),
      entityId: event.payload.id,
      customerId: event.payload.requester_id, // Would need mapping
      payload: {
        externalId: event.payload.id,
        title: event.payload.subject,
        content: event.payload.description,
        owner: event.payload.assignee_id,
        status: event.payload.status,
        priority: event.payload.priority,
        metadata: event.payload,
      },
      metadata: {
        source: 'zendesk',
        timestamp: event.timestamp,
        context: {
          provider: 'zendesk',
          webhookId: event.payload.id,
        },
      },
    };
  }

  private mapEntityType(eventType: string): string {
    if (eventType.includes('ticket')) return 'SUPPORT_TICKET';
    if (eventType.includes('comment')) return 'ACTIVITY';
    if (eventType.includes('article')) return 'ARTICLE';
    return 'UNKNOWN';
  }
}

class SlackNormalizer implements EventNormalizer {
  async normalize(event: WebhookEvent): Promise<NormalizedEvent> {
    return {
      eventType: event.eventType,
      entityType: this.mapEntityType(event.eventType),
      entityId: event.payload.ts,
      customerId: '', // Slack messages may not have customer mapping
      payload: {
        externalId: event.payload.ts,
        content: event.payload.text,
        author: event.payload.user,
        channel: event.payload.channel,
        team: event.payload.team,
        metadata: event.payload,
      },
      metadata: {
        source: 'slack',
        timestamp: new Date(parseFloat(event.payload.ts) * 1000).toISOString(),
        context: {
          provider: 'slack',
          webhookId: event.payload.ts,
        },
      },
    };
  }

  private mapEntityType(eventType: string): string {
    if (eventType.includes('message')) return 'ACTIVITY';
    if (eventType.includes('channel')) return 'CHANNEL';
    if (eventType.includes('team')) return 'WORKSPACE';
    return 'UNKNOWN';
  }
}

function mapStripeObject(entityType: string, object: any): any {
  switch (entityType) {
    case 'INVOICE':
      return {
        externalId: object.id,
        number: object.number,
        amount: object.total,
        currency: object.currency,
        status: object.status,
        dueDate: object.due_date ? new Date(object.due_date * 1000).toISOString() : null,
        customerId: object.customer,
        createdAt: new Date(object.created * 1000).toISOString(),
      };
    case 'SUBSCRIPTION':
      return {
        externalId: object.id,
        status: object.status,
        planName: object.items?.data[0]?.price?.nickname || 'Unknown',
        amount: object.items?.data[0]?.price?.unit_amount || 0,
        quantity: object.quantity,
        startedAt: new Date(object.created * 1000).toISOString(),
        currentPeriodStart: new Date(object.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(object.current_period_end * 1000).toISOString(),
        trialEndsAt: object.trial_end ? new Date(object.trial_end * 1000).toISOString() : null,
        canceledAt: object.canceled_at ? new Date(object.canceled_at * 1000).toISOString() : null,
        customerId: object.customer,
      };
    default:
      return object;
  }
}

// API Client for making authenticated requests
export class APIClient {
  private integration: AuthenticatedIntegration;
  private rateLimiter: RateLimiter;

  constructor(integration: AuthenticatedIntegration) {
    this.integration = integration;
    this.rateLimiter = new RateLimiter(integration.provider);
  }

  async request(options: {
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    params?: Record<string, any>;
  }): Promise<any> {
    await this.rateLimiter.acquire();

    const config = INTEGRATION_CONFIGS[this.integration.provider];
    const url = `${this.buildBaseUrl(config, options.endpoint)}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RevOps-Automation-Platform/1.0',
    };

    // Add authentication
    if (this.integration.credentials.accessToken) {
      headers['Authorization'] = `Bearer ${this.integration.credentials.accessToken}`;
    } else if (this.integration.credentials.apiKey) {
      // Add API key in header or based on provider requirements
      headers['X-API-Key'] = this.integration.credentials.apiKey;
    }

    // Add provider-specific headers
    if (config.provider === INTEGRATION_PROVIDER.SALESFORCE) {
      headers['Authorization'] = `Bearer ${this.integration.credentials.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.data ? JSON.stringify(options.data) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired, try refresh
          await IntegrationManager.getInstance().refreshTokens(this.integration);
          // Retry once after refresh
          const retryResponse = await fetch(url, {
            method: options.method || 'GET',
            headers: {
              ...headers,
              'Authorization': `Bearer ${this.integration.credentials.accessToken}`,
            },
            body: options.data ? JSON.stringify(options.data) : undefined,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          return retryResponse.json();
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('API request failed', {
        error,
        provider: this.integration.provider,
        endpoint: options.endpoint,
      });
      throw error;
    }
  }

  private buildBaseUrl(config: IntegrationConfig, endpoint: string): string {
    if (config.authType === AUTH_TYPE.API_KEY) {
      // Build URL for API key based integrations
      return `https://api.${config.provider.toLowerCase()}.com${endpoint}`;
    }
    
    // Salesforce OAuth URLs
    if (config.provider === INTEGRATION_PROVIDER.SALESFORCE) {
      // Salesforce instance URL would be stored in integration config
      return `${this.integration.configuration.instanceUrl}/services/data/v58.0${endpoint}`;
    }
    
    // HubSpot OAuth URLs
    if (config.provider === INTEGRATION_PROVIDER.HUBSPOT) {
      return `https://api.hubapi.com${endpoint}`;
    }
    
    // Default case
    return `https://api.${config.provider.toLowerCase()}.com${endpoint}`;
  }
}

// Rate limiting for API requests
class RateLimiter {
  private provider: INTEGRATION_PROVIDER;
  private requests: number = 0;
  private windowStart: number = Date.now();

  constructor(provider: INTEGRATION_PROVIDER) {
    this.provider = provider;
  }

  async acquire(): Promise<void> {
    const config = INTEGRATION_CONFIGS[this.provider];
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > 60000) { // 1 minute
      this.requests = 0;
      this.windowStart = now;
    }

    // Check rate limit
    if (this.requests >= config.rateLimits.requestsPerMinute) {
      const waitTime = 60000 - (now - this.windowStart);
      logger.debug(`Rate limit exceeded for ${this.provider}`, {
        waitTime,
        currentRequests: this.requests,
        limit: config.rateLimits.requestsPerMinute,
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests++;
  }
}

// Type definitions
type OAuthState = {
  provider: string;
  customerId: string;
  state: string;
  expiresAt: number;
  redirectUri: string;
  clientId?: string;
};

type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type OAuthInit = {
  authUrl: string;
  state: string;
  expiresAt: string;
  provider: string;
};

type OAuthCallbackResult = {
  success: boolean;
  integrationId: string;
  provider: string;
  customerId: string;
};

// Export manager instance
export const integrationManager = IntegrationManager.getInstance();
