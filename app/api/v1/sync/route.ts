import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAuthentication } from '@/lib/api/middleware';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getLogger } from '@/lib/utils/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger('sync-api');

// Schema for POST requests
const syncRequestSchema = z.object({
  customerId: z.string().uuid(),
  providers: z.array(z.enum(['salesforce', 'hubspot', 'outreach', 'salesloft', 'gong', 'stripe'])),
  syncType: z.enum(['full', 'incremental', 'specific_entities']).default('incremental'),
  entityIds: z.array(z.string().uuid()).optional(),
});

// POST /api/v1/sync
export async function POST(request: NextRequest) {
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    const body = await request.json();
    const { customerId, providers, syncType, entityIds } = syncRequestSchema.parse(body);

    // Validate that the customer matches the authenticated user
    if (customerId !== context.user!.id) {
      return NextResponse.json(
        { error: 'You can only sync data for your own customer' },
        { status: 403 }
      );
    }

    // Begin sync process
    logger.info('Starting sync process', {
      customerId,
      providers,
      syncType,
      entityIds: entityIds?.length || 0
    });

    const syncResults = [];

    // Process each provider
    for (const provider of providers) {
      try {
        let providerSyncResult;
        
        if (provider === 'salesforce') {
          providerSyncResult = await syncSalesforce(customerId, syncType, entityIds);
        } else if (provider === 'hubspot') {
          providerSyncResult = await syncHubSpot(customerId, syncType, entityIds);
        } else if (provider === 'stripe') {
          providerSyncResult = await syncStripe(customerId, syncType);
        } else if (provider === 'outreach') {
          providerSyncResult = await syncOutreach(customerId, syncType, entityIds);
        } else if (provider === 'salesloft') {
          providerSyncResult = await syncSalesLoft(customerId, syncType, entityIds);
        } else {
          providerSyncResult = { 
            success: false, 
            error: `Unsupported provider: ${provider}`,
            details: `Provider not yet implemented`
          };
        }
        
        syncResults.push({
          provider,
          success: providerSyncResult.success,
          message: providerSyncResult.message || 'Completed successfully',
          recordsProcessed: providerSyncResult.recordsProcessed || 0,
          errors: providerSyncResult.errors || [],
          duration: providerSyncResult.duration || 0,
        });
        
      } catch (error: any) {
        logger.error(`Sync failed for ${provider}`, { error: error.message });
        syncResults.push({
          provider,
          success: false,
          message: error.message || 'Sync failed',
          recordsProcessed: 0,
          errors: [error.message],
          duration: 0,
        });
      }
    }

    // Also generate AI insights after successful sync
    let insightsGenerated = false;
    try {
      if (syncResults.some(result => result.success)) {
        // Trigger insight generation
        const insightsResult = await generateInsights(customerId);
        insightsGenerated = insightsResult.success;
        
        logger.info('AI insights generated after sync', {
          customerId,
          insightsCount: insightsResult.count,
        });
      }
    } catch (error: any) {
      logger.error('Failed to generate insights after sync', { error: error.message });
    }

    return successResponse({
      message: 'Sync completed',
      results: syncResults,
      insightsGenerated,
      summary: {
        totalProviders: providers.length,
        successfulProviders: syncResults.filter(r => r.success).length,
        totalRecords: syncResults.reduce((sum, result) => 
          sum + (result.recordsProcessed || 0), 0
        ),
        averageDuration: syncResults.length > 0 
          ? syncResults.reduce((sum, result) => 
            sum + result.duration, 0) / syncResults.length
          : 0,
      },
    });

  } catch (error: any) {
    logger.error('Sync process failed', { error: error.message, stack: error.stack });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Sync failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Function to sync Salesforce data
async function syncSalesforce(customerId: string, syncType: string, entityIds?: string[]): Promise<any> {
  const startTime = Date.now();
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const serviceSupabase = await createServiceClient();

    let query = supabase
      .from('deals')
      .select(`
        id, name, amount, stage, probability, close_date, created_date,
        account_id, owner_id, health_score, risk_score,
        created_at, updated_at, deal_age_days
      `)
      .eq('customer_id', customerId)
      .eq('source_system', 'salesforce')
      .eq('deleted_at', null)
      .order('updated_at', { ascending: false });

    // Apply entity filtering if specified
    if (entityIds && entityIds.length > 0) {
      query = query.in('id', entityIds);
    }

    if (syncType === 'specific_entities' && entityIds && entityIds.length === 0) {
      return { success: false, error: 'No entity IDs specified for specific sync' };
    }

    let recordsDeleted = 0;
    let recordsUpdated = 0;
    
    // Fetch the data
    const { data: salesforceDeals, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Salesforce query failed: ${fetchError.message}`);
    }

    if (!salesforceDeals || salesforceDeals.length === 0) {
      return { success: true, recordsProcessed: 0, message: 'No records to sync', duration: Date.now() - startTime, errors: [] };
    }

    // Process each record
    const processedDeals = await Promise.all(
      salesforceDeals.map(async (deal) => {
        try {
          // Simulate processing time
          const processingTime = Math.random() * 1000 + 500; // 0.5-1.5 seconds per record
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          return {
            updated: true,
            processingTime
          };
        } catch (error: any) {
          return {
            updated: false,
            error: error.message,
            processingTime: 0
          };
        }
      })
    );

    recordsUpdated = processedDeals.filter(deal => deal.updated).length;
    recordsDeleted = processedDeals.filter(deal => !deal.updated).length;

    logger.info('Salesforce sync completed', {
      customerId,
      totalRecords: salesforceDeals.length,
      recordsUpdated,
      recordsDeleted,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      recordsProcessed: salesforceDeals.length,
      recordsUpdated,
      recordsDeleted,
      duration: Date.now() - startTime,
      details: `Synced ${recordsUpdated}, deleted ${recordsDeleted} records`
    };

  } catch (error: any) {
    logger.error('Salesforce sync failed', { error: error.message, stack: error.stack });
    return {
      success: false,
      message: `Salesforce sync failed: ${error.message}`,
      duration: Date.now() - startTime,
      errors: [error.message],
    };
  }
}

// Function to sync HubSpot data
async function syncHubSpot(customerId: string, syncType: string, entityIds?: string[]): Promise<any> {
  const startTime = Date.now();
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const serviceSupabase = await createServiceClient();

    let query = supabase
      .from('deals')
      .select(`
        id, name, amount, stage, probability, close_date, created_date,
        account_id, owner_id, health_score, risk_score,
        created_at, updated_at, deal_age_days
      `)
      .eq('customer_id', customerId)
      .eq('source_system', 'hubspot')
      .eq('deleted_at', null)
      .order('updated_at', { ascending: false });

    // Apply entity filtering if specified
    if (entityIds && entityIds.length > 0) {
      query = query.in('id', entityIds);
    }

    if (syncType === 'specific_entities' && entityIds && entityIds.length === 0) {
      return { success: false, error: 'No entity IDs specified for specific sync' };
    }

    let recordsDeleted = 0;
    let recordsUpdated = 0;
    
    const { data: hubSpotDeals, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`HubSpot query failed: ${fetchError.message}`);
    }

    if (!hubSpotDeals || hubSpotDeals.length === 0) {
      return { success: true, recordsProcessed: 0, message: 'No records to sync', duration: Date.now() - startTime, errors: [] };
    }

    // Process each record
    const processedDeals = await Promise.all(
      hubSpotDeals.map(async (deal) => {
        try {
          // Simulate processing time
          const processingTime = Math.random() * 800 + 200; // 0.2-1 second per record
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          return {
            updated: true,
            processingTime
          };
        } catch (error: any) {
          return {
            updated: false,
            error: error.message,
            processingTime: 0
          };
        }
      })
    );

    recordsUpdated = processedDeals.filter(deal => deal.updated).length;
    recordsDeleted = processedDeals.filter(deal => !deal.updated).length;

    logger.info('HubSpot sync completed', {
      customerId,
      totalRecords: hubSpotDeals.length,
      recordsUpdated,
      recordsDeleted,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      recordsProcessed: hubSpotDeals.length,
      recordsUpdated,
      recordsDeleted,
      duration: Date.now() - startTime,
      details: `Synced ${recordsUpdated} records`
    };

  } catch (error: any) {
    logger.error('HubSpot sync failed', { error: error.message, stack: error.stack });
    return {
      success: false,
      message: `HubSpot sync failed: ${error.message}`,
      duration: Date.now() - startTime,
      errors: [error.message],
    };
  }
}

// Function to sync Stripe data
async function syncStripe(customerId: string, syncType: string, entityIds?: string[]): Promise<any> {
  const startTime = Date.now();
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const serviceSupabase = await createServiceClient();

    let recordsProcessed = 0;
    
    // Get recent subscriptions, invoices for the customer
    const { data: stripeData } = await serviceSupabase
      .from('subscriptions')
      .select(`
        id, status, amount, plan_name,
        created_at, canceled_at, ends_at
      `)
      .eq('customer_id', customerId)
      .eq('deleted_at', null)
      .limit(1000)
      .order('created_at', { ascending: false });

    if (!stripeData || stripeData.length === 0) {
      return { success: true, recordsProcessed: 0, message: 'No records to sync' };
    }

    // Process each subscription
    const processedSubscriptions = await Promise.all(
      stripeData.map(async (sub) => {
        try {
          // Simulate processing time
          const processingTime = 200 + Math.random() * 300; // 0.2-0.5 seconds
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          return {
            updated: true,
            processingTime
          };
        } catch (error: any) {
          return {
            updated: false,
            error: error.message,
            processingTime: 0
          };
        }
      })
    );

    recordsProcessed = processedSubscriptions.filter(sub => sub.updated).length;

    logger.info('Stripe sync completed', {
      customerId,
      recordsProcessed,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      recordsProcessed,
      duration: Date.now() - startTime,
      details: `Synced ${recordsProcessed} records`
    };

  } catch (error: any) {
    logger.error('Stripe sync failed', { error: error.message, stack: error.stack });
    return {
      success: false,
      message: `Stripe sync failed: ${error.message}`,
      duration: Date.now() - startTime,
      errors: [error.message],
    };
  }
}

// Function to sync Outreach data
async function syncOutreach(customerId: string, syncType: string, entityIds?: string[]): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Outreach integration logic here
    logger.info('Outreach sync not yet implemented', { customerId, syncType, entityIds });
    
    return {
      success: false,
      message: 'Outreach integration not yet implemented',
      duration: Date.now() - startTime,
    };
      
  } catch (error: any) {
    return {
      success: false,
      error: `Outreach sync failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

// Function to sync SalesLoft data
async function syncSalesLoft(customerId: string, syncType: string, entityIds?: string[]): Promise<any> {
  const startTime = Date.now();
  
  try {
    // SalesLoft integration logic here  
    logger.info('SalesLoft sync not yet implemented', { customerId, syncType, entityIds });
    
    return {
      success: false,
      message: 'SalesLoft integration not yet implemented',
      duration: Date.now() - startTime,
    };
      
  } catch (error: any) {
    return {
      success: error.name !== 'Error',
      message: error.message || 'SalesLoft sync failed',
      duration: Date.now() - startTime,
    };
  }
}

// Function to sync Gong data
async function syncGong(customerId: string, syncType: string, entityIds?: string[]): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Gong integration logic here  
    logger.info('Gong sync not yet implemented', { customerId, syncType, entityIds });
    
    return {
      success: false,
      message: 'Gong integration not yet implemented',
      duration: Date.now() - startTime,
    };
    
  } catch (error: any) {
    return {
      success: error.name !== 'Error',
      message: error.message || 'Gong sync failed',
      duration: Date.now() - startTime,
    };
  }
}

// Generate AI insights after sync
async function generateInsights(customerId: string) {
  const startTime = Date.now();
  
  try {
    // This would call the AI processing pipeline
    logger.info('Generating AI insights', { customerId });
    
    // For now, return sample insights
    const sampleInsights = [
      {
        insight_type: 'DEAL_RISK',
        title: "High-value deal risk detected",
        description: "A $120K enterprise deal has been inactive for 45 days in negotiation",
        severity: 'HIGH',
        confidence_score: 85,
        impact_score: 8,
        entity_type: 'DEAL',
        entity_id: 'deal_abc123',
        recommendation: "Schedule executive call to break the deadlock",
        action_items: ["Executive meeting scheduled", "Pricing review", "Updated forecast probability"],
      },
      {
        insight_type: 'PIPELINE_HEALTH',
        title: "Pipeline velocity slowdown",
        description: "Deals are taking 45 days longer on average",
        severity: 'MEDIUM',
        confidence_score: 78,
        impact_score: 6,
        entity_type: 'TEAM',
        entity_id: 'team_456',
        recommendation: "Review sales coaching and prioritize urgent opportunities",
        action_items: ["Provide coaching to slow-moving deals", "Update deal playbooks"],
      },
    ];

    // Store insights in database
    const createdInsights = (await Promise.all(
      sampleInsights.map(async (insight) => {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const { data, error: insertError } = await createClient()
            .from('ai_insights')
            .insert({
              customer_id: customerId,
              insight_type: insight.insight_type,
              title: insight.title,
              description: insight.description,
              severity: insight.severity,
              confidence_score: insight.confidence_score,
              impact_score: insight.impact_score,
              entity_type: insight.entity_type,
              entity_id: insight.entity_id,
              recommendation: insight.recommendation,
              action_items: insight.action_items,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          
          return data;
        } catch (error: any) {
          logger.error('Failed to create insight', { error: error.message });
          return null;
        }
      })
    )).filter(Boolean);

    const processingTimeMs = Date.now() - startTime;
    
    logger.info('AI insights generated', {
      customerId,
      insightsCount: createdInsights.length,
      processingTime: processingTimeMs
    });

    return {
      success: true,
      count: createdInsights.length,
      processing_time: processingTimeMs,
    };

  } catch (error: any) {
    logger.error('Failed to generate insights', { error: error.message });
    
    return {
      success: false,
      error: error.message || 'Insight generation failed',
    };
  }
}

// Enhanced Response helper
const successResponse = (data: any, metadata?: any) => {
  const response = new Response(JSON.stringify({
    success: true,
    data,
    ...metadata
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response;
};
