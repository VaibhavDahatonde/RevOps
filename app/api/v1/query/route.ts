import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAuthentication, successResponse } from '@/lib/api/middleware';
import { createClient } from '@/lib/supabase/server';
import { getLogger } from '@/lib/utils/logger';
import { getQueryEngine } from '@/lib/ai/query-engine';
import { z } from 'zod';

const logger = getLogger('query-api');

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  question: z.string().min(1).max(500),
  customerId: z.string().uuid(),
});

// POST /api/v1/query
export async function POST(request: NextRequest) {
  try {
    const context = await authenticate(request);
    requireAuthentication(context);
    
    const body = await request.json();    
    const { question, customerId } = querySchema.parse(body);
    
    // Validate that the customer matches the authenticated user
    if (customerId !== context.user!.id) {
      return NextResponse.json(
        { error: 'You can only query data for your own customer' },
        { status: 403 }
      );
    }
    
    logger.info('Natural language query submitted', {
      customerId,
      question,
      questionLength: question.length,
    });
    
    // Use the real AI query engine
    const queryEngine = getQueryEngine();
    const aiResponse = await queryEngine.processQuery(question, customerId);
    
    // Log the query and response
    try {
      const supabase = await createClient();
      
      // Store the query for analytics
      await supabase
        .from('events')
        .insert({
          customer_id: customerId,
          event_type: 'query_submitted',
          event_category: 'AI',
          source_system: 'natural_language_query',
          entity_type: 'QUERY',
          entity_id: context.user!.id,
          payload: {
            question,
            response: aiResponse.answer,
            confidence: aiResponse.confidence,
            processing_time_ms: aiResponse.processingTimeMs,
            data_used: aiResponse.dataUsed,
            user_id: context.user!.id,
          },
          created_at: new Date().toISOString(),
        });
      
    } catch (error: any) {
      logger.error('Failed to log query to database', { error: error.message });
    }
    
    // Return the response
    return successResponse({
      answer: aiResponse.answer,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources,
      suggestions: aiResponse.suggestions,
      processingTime: aiResponse.processingTimeMs,
      dataUsed: aiResponse.dataUsed,
    });

  } catch (error: any) {
    logger.error('Query processing failed', { error: error.message });
    
    if (error.message) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
