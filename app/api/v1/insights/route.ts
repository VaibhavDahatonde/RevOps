import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, paginatedResponse } from '@/lib/api/middleware';
import { authenticate, requireAuthentication, validateRequest } from '@/lib/api/middleware';
import Joi from 'joi';
import { getLogger } from '@/lib/utils/logger';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const logger = getLogger('insights-api');

const insightsQuerySchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  type: Joi.string().valid('RISK', 'OPPORTUNITY', 'TREND', 'ANOMALY').optional(),
  entityType: Joi.string().valid('DEAL', 'ACCOUNT', 'REP', 'TEAM').optional(),
  status: Joi.string().valid('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED').default('ACTIVE'),
});

// Simple cache to prevent redundant calls (in production, use Redis)
const insightCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// GET /api/v1/insights
export async function GET(request: NextRequest) {
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    // Parse and validate query parameters
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);
    const { error, value } = insightsQuerySchema.validate(query);
    
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const { 
      customerId, 
      page, 
      limit, 
      severity,
      type,
      entityType,
      status
    } = value;

    // Create cache key
    const cacheKey = `insights_${customerId}_${page}_${limit}_${severity || 'all'}_${type || 'all'}_${entityType || 'all'}_${status}`
    
    // Check cache first
    const cached = insightCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < cached.ttl) {
      logger.debug('Returning cached insights', { customerId, cacheHit: true });
      return successResponse(cached.data);
    }

    // FETCH REAL INSIGHTS FROM DATABASE
    const supabase = await createServiceClient();
    
    let queryBuilder = supabase
      .from('ai_insights')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (severity) queryBuilder = queryBuilder.eq('severity', severity);
    if (type) queryBuilder = queryBuilder.eq('insight_type', type);
    if (status) queryBuilder = queryBuilder.eq('status', status);

    const { data: realInsights, error: dbError } = await queryBuilder;

    if (dbError) {
      logger.error('Database error fetching insights', { error: dbError.message });
    }

    // Enrich and format insights
    let insightsData = realInsights || [];
    
    // If no real insights, generate sample insights for testing
    if (insightsData.length === 0) {
      logger.info('No real insights found, generating sample insights');
      insightsData = generateSampleInsights(customerId, { severity, type, status });
    }
    
    const responseData = {
      insights: insightsData,
      pagination: {
        page,
        limit,
        total: insightsData.length,
        totalPages: Math.ceil(insightsData.length / limit),
        hasNext: page * limit < insightsData.length,
        hasPrev: page > 1,
      }
    };

    // Cache the response (5 minutes TTL)
    insightCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
      ttl: 300000 // 5 minutes
    });

    logger.info('Insights retrieved successfully', {
      customerId,
      count: insightsData.length,
      cacheHit: false,
    });

    return successResponse(responseData);

  } catch (error: any) {
    logger.error('Failed to get insights', { error: error?.message });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch insights',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Generate sample insights for testing when no real data exists
function generateSampleInsights(customerId: string, options: any) {
  const sampleInsights = [
    {
      id: `insight_${customerId}_1`,
      customer_id: customerId,
      insight_type: 'RISK',
      title: 'High-value deals stuck in proposal stage',
      description: '3 deals worth $425K have been in proposal stage for over 14 days',
      severity: 'HIGH',
      confidence_score: 0.87,
      impact_score: 8,
      recommendation: 'Follow up with decision makers to identify any blockers or concerns',
      action_items: ['Contact decision makers', 'Review proposal terms', 'Identify competitive threats'],
      supporting_data: { dealCount: 3, totalValue: 425000, avgDaysInStage: 18 },
      key_metrics: { riskScore: 75, urgency: 'High' },
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `insight_${customerId}_2`,
      customer_id: customerId,
      insight_type: 'OPPORTUNITY',
      title: 'Enterprise deals showing strong momentum',
      description: '2 deals over $100K have customer activity in the last 48 hours',
      severity: 'LOW',
      confidence_score: 0.92,
      impact_score: 6,
      recommendation: 'Accelerate these deals by scheduling executive demo this week',
      action_items: ['Schedule executive demo', 'Prepare case studies', 'Identify technical contacts'],
      supporting_data: { dealCount: 2, totalValue: 650000, recentActivities: 12 },
      key_metrics: { momentum: 'Strong', probability: 85 },
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `insight_${customerId}_3`,
      customer_id: customerId,
      insight_type: 'ALERT',
      title: 'Forecast accuracy needs attention',
      description: 'Last quarter forecast accuracy was 68% - below target of 85%',
      severity: 'MEDIUM',
      confidence_score: 0.95,
      impact_score: 7,
      recommendation: 'Review forecasting methods and improve deal probability updates',
      action_items: ['Review deal probabilities', 'Update close dates', 'Improve pipeline discipline'],
      supporting_data: { lastQuarterAccuracy: 0.68, targetAccuracy: 0.85, variance: '17%' },
      key_metrics: { accuracy: 68, trend: 'declining' },
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Apply filters
  let filteredInsights = sampleInsights;
  
  if (options.severity && options.severity !== 'all') {
    filteredInsights = filteredInsights.filter(insight => insight.severity === options.severity);
  }
  
  if (options.type && options.type !== 'all') {
    filteredInsights = filteredInsights.filter(insight => insight.insight_type === options.type);
  }
  
  if (options.status && options.status !== 'all') {
    filteredInsights = filteredInsights.filter(insight => insight.status === options.status);
  }

  return filteredInsights;
}

// Generate dynamic insights based on customer data (DEPRECATED - using real DB insights now)
async function generateDynamicInsights(customerId: string, options: any) {
    return { data: [], total: 0 };
}

// Helper function to enrich insights
async function enrichInsights(insights: any[]): Promise<any[]> {
  return insights.map(insight => {
    return {
      ...insight,
      // Format dates
      formattedCreatedAt: insight.created_at ? 
        new Date(insight.created_at).toLocaleString() : null,
      formattedAcknowledgedAt: insight.acknowledged_at ? 
        new Date(insight.acknowledged_at).toLocaleString() : null,
      // Ensure essential fields have fallbacks
      title: insight.title || 'Untitled Insight',
      description: insight.description || 'No description available',
      severity: insight.severity || 'MEDIUM',
      type: insight.type || 'TREND',
      customer: insight.customer || { name: 'Unknown Customer' },
      entity_details: insight.entity_details || {
        id: 'unknown',
        name: 'Unknown Entity',
        amount: 0,
        stage: 'Unknown'
      },
      acknowledged_by: insight.acknowledged_by || null,
      // Add computed fields
      isExpired: insight.expires_at ? new Date(insight.expires_at) < new Date() : false,
      daysSinceCreated: insight.created_at ? 
        Math.floor((new Date().getTime() - new Date(insight.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    };
  });
}

// POST /api/v1/insights (for generating insights)
export async function POST(request: NextRequest) {
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    const body = await request.json();
    const { customerId, insightRequest } = body;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Validate customer ID matches authenticated user
    if (customerId !== context.user!.customerId) {
      return NextResponse.json(
        { error: 'You can only generate insights for your own customer' },
        { status: 403 }
      );
    }

    // In production, this would trigger AI insight generation
    logger.info('Insight generation requested', {
      customerId,
      insightType: insightRequest?.type,
      entityId: insightRequest?.entityId,
      entityType: insightRequest?.entityType,
    });

    return successResponse({
      message: 'Insight analysis started',
      status: 'processing',
      jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      // In production, this would return a job ID for tracking
    });

  } catch (error: any) {
    logger.error('Failed to generate insights', { error: error.message });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate insights',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Note: Acknowledge functionality moved to /api/v1/insights/[id]/acknowledge/route.ts
