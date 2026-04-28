import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, paginatedResponse } from '@/lib/api/middleware';
import { authenticate, requireAuthentication, validateRequest, ERROR_CODES, HTTP_STATUS_CODES } from '@/lib/api/middleware';
import Joi from 'joi';
import { getLogger } from '@/lib/utils/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const logger = getLogger('metrics-api');

const metricsQuerySchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  limit: Joi.number().integer().min(1).max(10).default(1),
  periodType: Joi.string().valid('WEEKLY', 'MONTHLY', 'QUARTERLY').default('MONTHLY'),
  entityType: Joi.string().valid('DEAL', 'ACCOUNT', 'ACTIVITY').default('DEAL'),
});

// GET /api/v1/metrics
export async function GET(request: NextRequest) {
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    // Parse and validate query parameters
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);
    const { error, value } = metricsQuerySchema.validate(query);
    
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const { customerId, limit, periodType, entityType } = value;
    
    // Fetch metrics from Supabase
    const supabase = await createServiceClient();
    
    const { data: metricsData, error: dbError } = await supabase
      .from('metrics')
      .select('*')
      .eq('customer_id', customerId)
      .order('calculated_at', { ascending: false })
      .limit(limit || 2);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const responseData = {
      data: {
        metrics: metricsData || []
      },
      success: true
    };
    
    logger.info('Metrics retrieved successfully', {
      customerId,
      count: metricsData?.length || 0
    });

    return successResponse(responseData);

  } catch (error: any) {
    logger.error('Failed to get metrics', { error: error.message, stack: error.stack });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Generate sample metrics for development/testing
function generateSampleMetrics(customerId: string, periodType: string, entityType: string, limit: number) {
  const baseMetrics = [
    {
      id: `metric_${Date.now()}_1`,
      customerId,
      metricType: 'PIPELINE',
      metricName: 'total_pipeline',
      metricValue: 2850000,
      metricPeriod: periodType,
      periodStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEndDate: new Date().toISOString(),
      dimensions: { entityType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `metric_${Date.now()}_2`,
      customerId,
      metricType: 'PIPELINE',
      metricName: 'weighted_pipeline',
      metricValue: 1750000,
      metricPeriod: periodType,
      periodStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEndDate: new Date().toISOString(),
      dimensions: { entityType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `metric_${Date.now()}_3`,
      customerId,
      metricType: 'FORECAST',
      metricName: 'forecast_win_rate',
      metricValue: 0.78,
      metricPeriod: periodType,
      periodStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEndDate: new Date().toISOString(),
      dimensions: { entityType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `metric_${Date.now()}_4`,
      customerId,
      metricType: 'ACTIVITY',
      metricName: 'total_activities',
      metricValue: 847,
      metricPeriod: periodType,
      periodStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEndDate: new Date().toISOString(),
      dimensions: { entityType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `metric_${Date.now()}_5`,
      customerId,
      metricType: 'HEALTH',
      metricName: 'avg_health_score',
      metricValue: 72.3,
      metricPeriod: periodType,
      periodStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEndDate: new Date().toISOString(),
      dimensions: { entityType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Return only up to the limit requested
  return baseMetrics.slice(0, Math.min(limit, baseMetrics.length));
}

// POST /api/v1/metrics (for calculating metrics)
export async function POST(request: NextRequest) {
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    const body = await request.json();
    const { customerId, calculationRequest } = body;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Validate customer ID matches authenticated user
    if (customerId !== context.user!.customerId) {
      return NextResponse.json(
        { error: 'You can only calculate metrics for your own customer' },
        { status: 403 }
      );
    }

    // In production, this would trigger real metric calculation
    logger.info('Metric calculation requested', {
      customerId,
      calculationType: calculationRequest?.type,
    });

    return successResponse({
      message: 'Metric calculation started',
      status: 'processing',
      // In production, this would return a job ID for tracking
    });

  } catch (error: any) {
    logger.error('Failed to calculate metrics', { error: error.message });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate metrics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
