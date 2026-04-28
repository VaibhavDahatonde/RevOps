import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookRequest } from '@/lib/webhooks/webhook-ingestion';

export async function POST(
  request: NextRequest,
  context: { params: { provider: string } }
): Promise<NextResponse> {
  const provider = context.params.provider.toLowerCase();
  return handleWebhookRequest(provider, request);
}

export async function GET(
  request: NextRequest,
  context: { params: { provider: string } }
): Promise<NextResponse> {
  // Some providers use GET for webhook verification (e.g., Salesforce)
  // Handle accordingly based on provider
  
  const provider = context.params.provider.toLowerCase();
  
  switch (provider) {
    case 'salesforce':
      // Salesforce challenge-response verification
      return handleSalesforceChallenge(request);
      
    default:
      // Most providers don't support GET for webhooks
      return NextResponse.json(
        {
          error: 'METHOD_NOT_SUPPORTED',
          message: `${provider} webhooks do not support GET requests`,
        },
        { status: 405 }
      );
  }
}

function handleSalesforceChallenge(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');
  const token = url.searchParams.get('verification_token');
  const expectedToken = process.env.SALESFORCE_VERIFICATION_TOKEN;
  
  if (!challenge || !expectedToken || token !== expectedToken) {
    return NextResponse.json(
      {
        error: 'VERIFICATION_FAILED',
        message: 'Invalid verification token',
      },
      { status: 400 }
    );
  }
  
  // Respond with the challenge for Salesforce verification
  return NextResponse.json({
    challenge,
  });
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: { provider: string } }
): Promise<NextResponse> {
  // Handle CORS preflight requests for webhooks
  const response = NextResponse.json({});
  
  // Set CORS headers for webhook endpoints
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature, X-Timestamp');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}
