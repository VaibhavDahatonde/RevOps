import { NextRequest, NextResponse } from 'next/server';
import supabaseClass, { EnhancedQueryBuilder } from '@/lib/database/supabase';
import { createServiceClient } from '@/lib/supabase/server';
import { 
  errorHandler, 
  successResponse, 
  paginatedResponse, 
  authenticate, 
  requireAuthentication,
  validateRequest,
  APIError,
  HTTP_STATUS_CODES 
} from '@/lib/api/middleware';
import { getLogger } from '@/lib/utils/logger';
import Joi from 'joi';
import { PAGINATION_DEFAULTS, EntityType } from '@/lib/constants';
import { z } from 'zod';

const logger = getLogger('deals-api');

// Validation schemas
const dealQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(PAGINATION_DEFAULTS.DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(PAGINATION_DEFAULTS.MAX_LIMIT).default(PAGINATION_DEFAULTS.DEFAULT_LIMIT),
  stage: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  owner_id: Joi.string().uuid(),
  account_id: Joi.string().uuid(),
  search: Joi.string(),
  date_range_from: Joi.date(),
  date_range_to: Joi.date(),
  sort: Joi.string().default('updated_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  include: Joi.array().items(Joi.string().valid('account', 'contacts', 'activities')).default([]),
});

const dealCreateSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().max(2000).allow('', null),
  amount: Joi.number().min(0),
  currency: Joi.string().default('USD'),
  stage: Joi.string().required().valid('QUALIFIED', 'DISCOVERY', 'DEMONSTRATION', 'PROPOSAL', 'NEGOTIATION'),
  close_date: Joi.date().required().min('now'),
  owner_id: Joi.string().uuid().required(),
  account_id: Joi.string().uuid().required(),
  source: Joi.string(),
  type: Joi.string().valid('NEW', 'EXPANSION', 'RENEWAL', 'CHURN').default('NEW'),
  probability: Joi.number().integer().min(0).max(100),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'CRITICAL').default('NORMAL'),
  forecast_category: Joi.string().valid('PIPELINE', 'BEST_CASE', 'COMMIT', 'OMITTED').default('PIPELINE'),
  next_step: Joi.string().max(500),
  next_step_due_date: Joi.date().allow(null),
  custom_fields: Joi.object().default({}),
  tags: Joi.array().items(Joi.string()).default([]),
  competitor: Joi.string().allow(null),
});

const dealUpdateSchema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string().max(2000).allow('', null),
  amount: Joi.number().min(0),
  currency: Joi.string(),
  stage: Joi.string().valid('QUALIFIED', 'DISCOVERY', 'DEMONSTRATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'),
  close_date: Joi.date(),
  owner_id: Joi.string().uuid(),
  probability: Joi.number().integer().min(0).max(100),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'CRITICAL'),
  forecast_category: Joi.string().valid('PIPELINE', 'BEST_CASE', 'COMMIT', 'OMITTED'),
  next_step: Joi.string().max(500),
  next_step_due_date: Joi.date().allow(null),
  custom_fields: Joi.object(),
  tags: Joi.array().items(Joi.string()),
  competitor: Joi.string().allow(null),
});

// GET /api/v1/deals
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    // Parse and validate query parameters
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);
    const { error: validationError, value } = dealQuerySchema.validate(query);
    
    if (validationError) {
      throw new APIError(
        'VALIDATION_ERROR',
        'Invalid query parameters',
        HTTP_STATUS_CODES.BAD_REQUEST,
        validationError.details
      );
    }

    const {
      page,
      limit,
      stage,
      owner_id,
      account_id,
      search,
      date_range_from,
      date_range_to,
      sort,
      order,
      include
    } = value;

    // Build query
    const supabase = await createServiceClient();
    let queryBuilder = supabase
      .from('deals')
      .select(`
        *,
        accounts(id, name, domain, industry),
        owner:users(id, first_name, last_name, email)
      `, { count: 'exact' })
      .eq('customer_id', context.user!.customerId)
      .eq('deleted_at', null);

    // Apply filters
    if (stage) {
      if (Array.isArray(stage)) {
        queryBuilder = queryBuilder.in('stage', stage);
      } else {
        queryBuilder = queryBuilder.eq('stage', stage);
      }
    }

    if (owner_id) {
      queryBuilder = queryBuilder.eq('owner_id', owner_id);
    }

    if (account_id) {
      queryBuilder = queryBuilder.eq('account_id', account_id);
    }

    if (date_range_from || date_range_to) {
      if (date_range_from && date_range_to) {
        queryBuilder = queryBuilder.gte('close_date', date_range_from)
                                   .lte('close_date', date_range_to);
      } else if (date_range_from) {
        queryBuilder = queryBuilder.gte('close_date', date_range_from);
      } else if (date_range_to) {
        queryBuilder = queryBuilder.lte('close_date', date_range_to);
      }
    }

    // Search functionality
    if (search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sorting
    queryBuilder = queryBuilder.order(sort, { ascending: order === 'asc' });

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    // Execute query
    const { data: deals, error: dbError, count } = await queryBuilder;

    if (dbError) {
      logger.apiError('GET', '/deals', dbError as Error, { 
        requestId: context.requestId,
        userId: context.user!.id,
        customerId: context.user!.customerId 
      });
      throw new APIError(
        'DATABASE_ERROR',
        'Failed to fetch deals',
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        dbError
      );
    }

    // Include related data if requested
    let enrichedDeals = deals;
    
    if (include.includes('contacts')) {
      enrichedDeals = await enrichDealsWithContacts(enrichedDeals, context.user!.customerId, supabase);
    }

    if (include.includes('activities')) {
      enrichedDeals = await enrichDealsWithActivities(enrichedDeals, context.user!.customerId, supabase);
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Add health scores
    enrichedDeals = await calculateHealthScores(enrichedDeals);

    logger.info('Deals retrieved successfully', {
      requestId: context.requestId,
      userId: context.user!.id,
      customerId: context.user!.customerId,
      count: deals.length,
      total: count,
      page,
      filters: { stage, owner_id, account_id, search },
      executionTime: Date.now() - startTime,
    });

    return paginatedResponse(enrichedDeals, page, limit, count || 0, {
      filters: {
        stage,
        owner_id,
        account_id,
        search,
        date_range_from,
        date_range_to,
      },
      sort: {
        field: sort,
        direction: order,
      },
      meta: {
        totalAmount: deals.reduce((sum, deal) => sum + (deal.amount || 0), 0),
        avgAmount: deals.length > 0 ? deals.reduce((sum, deal) => sum + (deal.amount || 0), 0) / deals.length : 0,
        stages: [...new Set(deals.map(d => d.stage))],
        owners: [...new Set(deals.map(d => d.owner_id))]
      }
    });

  } catch (error: any) {
    return errorHandler(error, await authenticate(request));
  }
}

// POST /api/v1/deals
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    const supabase = await createServiceClient();

    // Validate request body
    const body = await request.json();
    const { error, value } = dealCreateSchema.validate(body);

    if (error) {
      throw new APIError(
        'VALIDATION_ERROR',
        'Invalid deal data',
        HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
        error.details
      );
    }

    const dealData = {
      ...value,
      customer_id: context.user!.customerId,
      created_date: new Date().toISOString().split('T')[0],
      probability: value.probability || getDefaultProbability(value.stage),
    };

    // Create deal
    const { data: deal, error: createError } = await supabase
      .from('deals')
      .insert(dealData)
      .select(`
        *,
        accounts(id, name, domain, industry),
        owner:users(id, first_name, last_name, email)
      `)
      .single();

    if (createError) {
      logger.error('Failed to create deal', {
        error: createError,
        requestId: context.requestId,
        userId: context.user!.id,
        customerId: context.user!.customerId,
        dealData,
      });
      throw new APIError(
        'DATABASE_ERROR',
        'Failed to create deal',
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        createError
      );
    }

    // Trigger AI analysis
    await triggerDealAnalysis(deal.id, context.user!.customerId);

    logger.info('Deal created successfully', {
      requestId: context.requestId,
      userId: context.user!.id,
      customerId: context.user!.customerId,
      dealId: deal.id,
      dealName: deal.name,
      amount: deal.amount,
      stage: deal.stage,
      executionTime: Date.now() - startTime,
    });

    return successResponse(deal);

  } catch (error: any) {
    return errorHandler(error, await authenticate(request));
  }
}

// Helper functions
function getDefaultProbability(stage: string): number {
  const probabilities = {
    'QUALIFIED': 20,
    'DISCOVERY': 35,
    'DEMONSTRATION': 50,
    'PROPOSAL': 75,
    'NEGOTIATION': 90,
    'CLOSED_WON': 100,
    'CLOSED_LOST': 0,
  };
  return probabilities[stage as keyof typeof probabilities] || 50;
}

async function enrichDealsWithContacts(
  deals: any[], 
  customerId: string,
  supabase?: any
): Promise<any[]> {
  const accountIds = [...new Set(deals.map(d => d.account_id).filter(Boolean))];
  
  if (accountIds.length === 0) return deals;

  const client = supabase || await createServiceClient();
  const { data: contacts } = await client
    .from('contacts')
    .select('*')
    .in('account_id', accountIds)
    .eq('customer_id', customerId)
    .eq('deleted_at', null);

  const contactsByAccount = (contacts || []).reduce((acc: Record<string, any[]>, contact: any) => {
    if (!acc[contact.account_id]) acc[contact.account_id] = [];
    acc[contact.account_id].push(contact);
    return acc;
  }, {});

  return deals.map(deal => ({
    ...deal,
    contacts: contactsByAccount[deal.account_id] || [],
  }));
}

async function enrichDealsWithActivities(
  deals: any[], 
  customerId: string,
  supabase?: any
): Promise<any[]> {
  const dealIds = deals.map(d => d.id);
  
  const client = supabase || await createServiceClient();
  const { data: activities } = await client
    .from('activities')
    .select('*')
    .in('deal_id', dealIds)
    .eq('customer_id', customerId)
    .eq('deleted_at', null)
    .order('activity_date', { ascending: false });

  const activitiesByDeal = (activities || []).reduce((acc: Record<string, any[]>, activity: any) => {
    if (!acc[activity.deal_id]) acc[activity.deal_id] = [];
    acc[activity.deal_id].push(activity);
    return acc;
  }, {});

  return deals.map(deal => ({
    ...deal,
    activities: activitiesByDeal[deal.id] || [],
    last_activity_date: activitiesByDeal[deal.id]?.[0]?.activity_date || null,
  }));
}

async function calculateHealthScores(deals: any[]): Promise<any[]> {
  return deals.map(deal => {
    let score = 50; // Base score

    // Activity score
    const daysSinceActivity = deal.last_activity_date 
      ? Math.floor((new Date().getTime() - new Date(deal.last_activity_date).getTime()) / (1000 * 60 * 60 * 24))
      : deal.days_in_stage || 30;

    if (daysSinceActivity < 7) score += 20;
    else if (daysSinceActivity < 14) score += 10;
    else if (daysSinceActivity > 30) score -= 20;

    // Stage progression
    const stageScores = {
      'QUALIFIED': 30,
      'DISCOVERY': 40,
      'DEMONSTRATION': 50,
      'PROPOSAL': 60,
      'NEGOTIATION': 80,
    };
    score += stageScores[deal.stage as keyof typeof stageScores] || 0;

    // Amount consideration
    if (deal.amount && deal.amount > 100000) score += 10;
    else if (deal.amount && deal.amount < 10000) score -= 10;

    // Probability alignment
    const expectedProbability = getDefaultProbability(deal.stage);
    const probabilityDiff = Math.abs(deal.probability - expectedProbability);
    if (probabilityDiff > 30) score -= 15;
    else if (probabilityDiff < 10) score += 5;

    // Stalled deal penalty
    if (deal.days_in_stage > 60 && deal.stage !== 'CLOSED_WON') {
      score -= 25;
    }

    return {
      ...deal,
      health_score: Math.max(0, Math.min(100, score)),
      days_in_stage: deal.days_in_stage || calculateDaysInStage(deal),
    };
  });
}

function calculateDaysInStage(deal: any): number {
  const stageChangeDate = deal.stage_changed_at || deal.created_at;
  return Math.floor((new Date().getTime() - new Date(stageChangeDate).getTime()) / (1000 * 60 * 60 * 24));
}

async function triggerDealAnalysis(dealId: string, customerId: string): Promise<void> {
  try {
    // Queue AI analysis job
    // This would normally use Bull queue, but for now we'll just log
    logger.info('Queuing deal analysis', { dealId, customerId });
  } catch (error: any) {
    logger.error('Failed to queue deal analysis', { error, dealId, customerId });
  }
}
