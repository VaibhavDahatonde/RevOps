// Seed database with sample data for testing
import { createServiceClient } from '@/lib/supabase/server';
import { faker } from '@faker-js/faker';

// Sample data generators
const sampleCustomers = [
  {
    email: 'test@example.com',
    company_name: 'TechCorp Inc',
    user_id: 'test-user-id' // This would need to match actual auth user
  },
  {
    email: 'demo@revops.com', 
    company_name: 'Demo Company',
    user_id: 'demo-user-id'
  }
];

const sampleOpportunities = [
  {
    name: 'Enterprise Software License - ACME Corp',
    amount: 500000,
    stage: 'proposal',
    close_date: '2024-02-15',
    probability: 75,
    owner_name: 'John Smith',
    account_name: 'ACME Corporation',
    source: 'salesforce',
    external_id: 'opp_001',
    health_score: 65,
    days_in_stage: 12,
    risk_factors: [' stagnant'],
    next_step: 'Executive demo scheduled',
    competitor: 'CompetitorX'
  },
  {
    name: 'Enterprise Platform - TechCo Inc',
    amount: 250000,
    stage: 'qualification', 
    close_date: '2024-03-30',
    probability: 35,
    owner_name: 'Jane Doe',
    account_name: 'TechCo Inc',
    source: 'hubspot',
    external_id: 'opp_002',
    health_score: 45,
    days_in_stage: 8,
    risk_factors: ['no_decision_maker'],
    next_step: 'Technical evaluation'
  },
  {
    name: 'Professional Services - Globex Corp',
    amount: 125000,
    stage: 'negotiation',
    close_date: '2024-01-20', 
    probability: 90,
    owner_name: 'Mike Johnson',
    account_name: 'Globex Corporation',
    source: 'salesforce',
    external_id: 'opp_003',
    health_score: 85,
    days_in_stage: 25,
    risk_factors: ['price_sensitive'],
    next_step: 'Legal review'
  },
  {
    name: 'Cloud Migration - StartUp Inc',
    amount: 75000,
    stage: 'demonstration',
    close_date: '2024-02-28',
    probability: 45, 
    owner_name: 'John Smith',
    account_name: 'StartUp Inc',
    source: 'salesforce',
    external_id: 'opp_004',
    health_score: 70,
    days_in_stage: 5,
    risk_factors: [],
    next_step: 'Demo completed'
  },
  {
    name: 'Managed Services - Enterprise Ltd',
    amount: 300000,
    stage: 'discovery',
    close_date: '2024-04-15',
    probability: 25,
    owner_name: 'Jane Doe', 
    account_name: 'Enterprise Ltd',
    source: 'hubspot',
    external_id: 'opp_005',
    health_score: 30,
    days_in_stage: 20,
    risk_factors: ['stagnant', 'technical_blocker'],
    next_step: 'Discovery call needed'
  }
];

const sampleInsights = [
  {
    insight_type: 'RISK',
    title: 'High-value deals stuck in proposal stage',
    description: '3 deals worth $425K have been in proposal stage for over 14 days',
    severity: 'HIGH',
    confidence_score: 0.87,
    impact_score: 8,
    recommendation: 'Follow up with decision makers to identify any blockers or concerns',
    action_items: ['Contact decision makers', 'Review proposal terms', 'Identify competitive threats'],
    supporting_data: { dealCount: 3, totalValue: 425000, avgDaysInStage: 18 },
    key_metrics: { riskScore: 75, urgency: 'High' }
  },
  {
    insight_type: 'OPPORTUNITY',
    title: 'Enterprise deals showing strong momentum',
    description: '2 deals over $100K have customer activity in the last 48 hours',
    severity: 'LOW',
    confidence_score: 0.92,
    impact_score: 6,
    recommendation: 'Accelerate these deals by scheduling executive demo this week',
    action_items: ['Schedule executive demo', 'Prepare case studies', 'Identify technical contacts'],
    supporting_data: { dealCount: 2, totalValue: 650000, recentActivities: 12 },
    key_metrics: { momentum: 'Strong', probability: 85 }
  },
  {
    insight_type: 'ALERT',
    title: 'Forecast accuracy needs attention',
    description: 'Last quarter forecast accuracy was 68% - below target of 85%',
    severity: 'MEDIUM',
    confidence_score: 0.95,
    impact_score: 7,
    recommendation: 'Review forecasting methods and improve deal probability updates',
    action_items: ['Review deal probabilities', 'Update close dates', 'Improve pipeline discipline'],
    supporting_data: { lastQuarterAccuracy: 0.68, targetAccuracy: 0.85, variance: '17%' },
    key_metrics: { accuracy: 68, trend: 'declining' }
  }
];

const sampleMetrics = [
  {
    total_pipeline: 1250000,
    forecast: 875000,
    win_rate: 0.78,
    avg_deal_size: 175000,
    avg_cycle_time: 45,
    velocity: 0.65
  },
  {
    total_pipeline: 1150000,
    forecast: 805000,
    win_rate: 0.72,
    avg_deal_size: 165000,
    avg_cycle_time: 48,
    velocity: 0.58
  }
];

export async function GET() {
  try {
    const supabase = await createServiceClient();
    
    // Get first customer (or create one for testing)
    let { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (customerError || !customers || customers.length === 0) {
      return Response.json({
        success: false,
        error: 'No customers found. Please create a customer account first.',
        details: customerError?.message
      }, { status: 400 });
    }
    
    const customer = customers[0];
    
    // Check if we already have data
    const { data: existingOpps } = await supabase
      .from('opportunities')
      .select('*')
      .eq('customer_id', customer.id)
      .limit(1);
    
    if (existingOpps && existingOpps.length > 0) {
      return Response.json({
        success: true,
        message: 'Sample data already exists',
        data: {
          customerId: customer.id,
          opportunitiesCount: existingOpps.length
        }
      });
    }
    
    // Insert sample opportunities
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .insert(sampleOpps.map(opp => ({
        ...opp,
        customer_id: customer.id,
        created_date: new Date().toISOString().split('T')[0],
        sales_cycle_days: Math.floor(Math.random() * 60) + 30
      })))
      .select();
    
    // Insert sample insights
    const { data: insights, error: insightError } = await supabase
      .from('ai_insights')
      .insert(sampleInsights.map(insight => ({
        ...insight,
        customer_id: customer.id,
        key_metrics: insight.key_metrics,
        supporting_data: insight.supporting_data,
        action_items: insight.action_items,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })))
      .select();
    
    // Insert sample metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .insert(sampleMetrics.map((metric, index) => ({
        ...metric,
        customer_id: customer.id,
        calculated_at: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000).toISOString()
      })))
      .select();
    
    return Response.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        customerId: customer.id,
        opportunitiesCreated: opportunities?.length || 0,
        insightsCreated: insights?.length || 0,
        metricsCreated: metrics?.length || 0,
        errors: {
          oppError: oppError?.message,
          insightError: insightError?.message,
          metricsError: metricsError?.message
        }
      }
    });
    
  } catch (error: any) {
    return Response.json({
      success: false,
      error: 'Failed to create sample data',
      details: error.message
    }, { status: 500 });
  }
}
