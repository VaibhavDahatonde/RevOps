import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test all major API endpoints
    const endpoints = [
      '/api/v1/metrics',
      '/api/v1/opportunities', 
      '/api/v1/insights',
      '/api/v1/query',
      '/api/customer',
      '/seed-data'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3001${endpoint}`, {
          method: endpoint === '/api/v1/query' ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: endpoint === '/api/v1/query' 
            ? JSON.stringify({ 
                question: 'What is my total pipeline value?', 
                customerId: 'test-customer-id' 
              }) 
            : undefined
        });
        
        results.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          message: response.statusText
        });
      } catch (error: any) {
        results.push({
          endpoint,
          status: 0,
          ok: false,
          error: error.message
        });
      }
    }
    
    return Response.json({
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error: any) {
    return Response.json({
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
}
