// Simple database connection test
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServiceClient();
    
    // Test basic connection
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, email, company_name')
      .limit(5);
    
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, name, amount, customer_id')
      .limit(5);
    
    const { data: insights, error: insightsError } = await supabase
      .from('insights')
      .select('id, title, severity, customer_id')
      .limit(5);

    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('id, metric_name, metric_value, customer_id')
      .limit(5);

    return Response.json({
      connected: true,
      data: {
        customers: { count: customers?.length || 0, data: customers, error: customersError?.message },
        deals: { count: deals?.length || 0, data: deals, error: dealsError?.message },
        insights: { count: insights?.length || 0, data: insights, error: insightsError?.message },
        metrics: { count: metrics?.length || 0, data: metrics, error: metricsError?.message }
      }
    });
  } catch (error: any) {
    return Response.json({
      connected: false,
      error: error.message
    }, { status: 500 });
  }
}
