# RevOps Automation Platform

🚀 **Transform manual RevOps work into automated intelligence** - Your existing Supabase-connected app can now eliminate manual data copying, CRM cleanup, and report preparation.

---

## 🎯 What This Adds to Your Project

### ✅ **Immediate Capabilities**
- **Real-time sync** from Salesforce, HubSpot, Gong, Stripe, and more
- **AI-powered deal health scoring** and risk analysis  
- **Automated CRM hygiene** with 50+ pre-built rules
- **Live pipeline metrics** without manual calculations
- **Leadership-ready reports** generated automatically

### 🔧 **Zero Disruption Integration**
- **Extends your existing database** with 15+ new automation tables
- **Adds new API endpoints** alongside your current routes
- **Works with your current authentication** system
- **Preserves all existing features** and data

---

## 🚀 Quick Start (5 Minutes)

### **1. Install New Packages**
```bash
# If you haven't already:
npm install

# Verify installation completed successfully
npm run type-check
```

### **2. Apply Database Schema (Extends Your Supabase)**
```bash
# Apply new automation tables to your existing Supabase
npm run db:setup

# This adds 15+ new tables while preserving your existing data:
# - deals (with AI scoring), activities, accounts, contacts  
# - events (immutable audit trail)
# - ai_insights, integrations, webhook processing, etc.
```

### **3. Set Up Upstash Redis (Cloud Redis)**
```bash
# 1. Go to [Upstash Redis](https://upstash.com/)
# 2. Create free account and database
# 3. Create database: "revops-automation-platform"
# 4. Get connection details from database page

# 5. Add Upstash Redis to your .env.local:
echo "# === RevOps Automation Features ===" >> .env.local
echo "ANTHROPIC_API_KEY=your-claude-api-key" >> .env.local
echo "REDIS_URL=redis://default:<password>@<host>:<port>" >> .env.local
echo "JWT_SECRET=your-super-secret-jwt-key-for-automation" >> .env.local
```

**Upstash Redis Benefits:**
- ✅ **No local installation required**
- ✅ **Free tier for development**
- ✅ **Cloud-based, always available**
- ✅ **Production-ready from day 1**

### **4. Start Development**
```bash
# Your existing dev command (enhanced with new features)
npm run dev

# No need to start Redis locally - Upstash handles everything!
```

#### **Upstash Redis Setup Details**
```bash
# In your Upstash console:
# 1. Click "Create Database"
# 2. Database name: "revops-automation-platform"
# 3. Region: Choose closest to you
# 4. Click "Create"

# 5. Go to your new database > "Details"
# 6. Copy the REST address (looks like):
#    redis://default:password@hostname:port

# 7. Add to your .env.local:
REDIS_URL=redis://default:your-password@your-host.upstash.io:port

# No Redis server to run - Upstash manages everything!
```
```

### **5. Test New Automation Endpoints**
```bash
# Test new deals API with AI scoring (will return 401 without auth, but verifies endpoint exists)
curl http://localhost:3000/api/v1/deals

# Test webhook processing
curl -X POST http://localhost:3000/api/v1/webhooks/hubspot \
  -H "Content-Type: application/json" \
  -d '{"test":"webhook-test"}'
```

---

## 🏗️ What's Added to Your Existing Supabase

### **New Tables (15+ Automation Tables)**
```sql
-- Run in Supabase SQL Editor to see what was added:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN (
  'deals', 'activities', 'events', 'ai_insights', 
  'integrations', 'campaigns', 'support_tickets',
  'subscriptions', 'invoices', 'metrics', 'hygiene_rules'
);

-- Your existing tables REMAIN PRESERVED
```

### **Enhanced Security**
```sql
-- New Row-Level Security policies added:
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Your customer data is now even more secure!
```

---

## 🔌 Integration Setup (Connect Your GTM Tools)

### **Salesforce Integration**
```bash
# 1. Create Connected App in Salesforce Developer Console:
#    - Name: RevOps Automation Platform
#    - Callback URL: http://localhost:3000/api/v1/webhooks/salesforce
#    - Scopes: api refresh_token

# 2. Add to .env.local:
echo "SALESFORCE_CLIENT_ID=your-salesforce-client-id" >> .env.local
echo "SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret" >> .env.local

# 3. Connect:
curl -X POST http://localhost:3000/api/v1/integrations/salesforce/connect
```

### **HubSpot Integration**
```bash
# 1. Create Private App in HubSpot Developer:
#    - Name: RevOps Automation Platform
#    - Webhook URL: http://localhost:3000/api/v1/webhooks/hubspot
#    - Scopes: crm.objects.deals crm.objects.accounts

# 2. Add to .env.local:
echo "HUBSPOT_CLIENT_ID=your-hubspot-client-id" >> .env.local
echo "HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret" >> .env.local
```

### **Stripe Integration**
```bash
# 1. In Stripe Dashboard > Developers > Webhooks:
#    - Endpoint: http://localhost:3000/api/v1/webhooks/stripe
#    - Events: invoice.payment_succeeded, customer.created

# 2. Add to .env.local:
echo "STRIPE_WEBHOOK_SECRET=whsec_your-stripe-secret" >> .env.local
```

---

## 🎯 Using New Automation Features

### **Enhanced Deals API** (Your existing app, but with AI intelligence)
```bash
# GET deals now includes:
# - AI health scores (0-100)
# - Risk factors (stagnation, missing next steps)
# - Engagement metrics from activity analysis
# - Similar deal comparisons
# - Days in stage tracking

GET /api/v1/deals?stage=PROPOSAL&include=account,activities
```

### **Real-time Webhook Processing**
```typescript
// Your app now automatically processes webhook events:
- Opportunity.CREATED/UPDATED from Salesforce
- Deal events from HubSpot  
- Call transcripts from Gong
- Payment events from Stripe

// Each webhook:
1. Verifies signature (secure)
2. Normalizes to canonical format
3. Updates your database in real-time
4. Triggers AI analysis automatically
5. Sends real-time updates to UI (WebSocket)
```

### **AI-Powered Insights**
```typescript
// New AI insights automatically generated:
- Deal risk analysis ("Stagnation detected - 18 days in stage")
- Health scoring (considering activity, engagement, timeline)
- Competition detection
- Forecast probability adjustment
- Next step recommendations
```

---

## 📊 Adding Automation to Your Existing Dashboard

### **Enhance Your Current Deal Component**
```typescript
// Add to your existing deals page/component:

import { getDealWithAIInsights } from '@/lib/api/deals';

function DealCard({ deal }) {
  return (
    <div className="p-4 border rounded-lg">
      <h3>{deal.name}</h3>
      <p>{deal.amount}</p>
      
      {/* NEW: AI Health Score */}
      <div className="mt-2">
        <div className={`text-sm font-medium ${
          deal.health_score > 80 ? 'text-green-600' :
          deal.health_score > 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          Health Score: {deal.health_score}/100
        </div>
      </div>
      
      {/* NEW: Risk Factors */}
      {deal.risk_factors?.length > 0 && (
        <div className="mt-2">
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
            {deal.risk_factors[0].type}
          </span>
        </div>
      )}
      
      {props.children /* your existing component content */}
    </div>
  );
}
```

### **Add Real-time Updates**
```typescript
// Add WebSocket connection to your existing app:
import { useRealtimeUpdates } from '@/lib/webhooks/realtime';

function Dashboard() {
  useRealtimeUpdates(); // <--- NEW: Real-time updates
  
  return (
    <div>
      <h1>Your Existing Dashboard</h1> 
      
      {/* NEW: Real-time indicators */}
      <RealtimePipelineChart />
      
      {/* Your existing dashboard components */}
      <YourExistingComponents />
    </div>
  );
}
```

---

## 🔧 Database Integration (Working with Supabase)

### **Extend Your Existing Queries**
```typescript
// Your existing queries now work + new automation data:

// OLD: Just basic deal info
const { data: deals } = await supabase
  .from('deals')
  .select('name, amount, stage');

// NEW: Enhanced with AI insights
const { data: deals } = await supabase
  .from('deals')
  .select(`
    *,
    health_score,
    risk_factors,
    days_in_stage,
    ai_insights(title, description, severity),
    last_activities(activity_type, activity_date, engagement_score)
  `)
  .order('updated_at', { ascending: false });
```

### **Add Automation Metrics to Your Dashboard**
```typescript
// Add to your existing dashboard page:

async function getPipelineHealth() {
  const { data } = await supabase
    .from('pipeline_snapshot') // NEW: Materialized view
    .select('*');
  
  // Returns: aggregated pipeline metrics, deal counts by stage, etc.
}

async function getTopRisks() {
  const { data } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('type', 'RISK')
    .eq('severity', 'HIGH')
    .limit(10);
}
```

---

## 🧪 Testing Integration with Your Existing App

### **Test with Your Current User Flow**
```typescript
// 1. Sign into your existing app (authentication unchanged)

// 2. Visit a deals page
// All your existing functionality works + new AI scores appear

// 3. Create test webhook event:
curl -X POST http://localhost:3000/api/v1/webhooks/hubspot \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "deal.creation",
    "objectId": "test-deal-123",
    "properties": {
      "dealname": "Test Automation Deal",
      "amount": "50000",
      "dealstage": "qualifiedtobuy"
    }
  }'

// 4. Check your deals page - should show new automation data
```

### **Verify Database Integration**
```sql
-- In Supabase SQL Editor, verify new functionality:

-- Check webhook processing
SELECT * FROM events 
WHERE event_type LIKE '%deal%' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check AI insights generation
SELECT * FROM ai_insights 
WHERE entity_type = 'DEAL'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📈 Step-by-Step Integration Guide

### **Level 1: Basic Integration (15 minutes)**
```bash
# 1. Apply database schema
npm run db:setup

# 2. Test webhook endpoints
curl http://localhost:3000/api/v1/webhooks/hubspot

# 3. Add health scores to existing deals page
#    (copy code from "Enhance Your Current Deal Component" above)
```

### **Level 2: Connect One Integration (30 minutes)**
```bash
# 1. Set up Salesforce or HubSpot webhook
# 2. Add webhook URL: http://localhost:3000/api/v1/webhooks/[provider]
# 3. Configure OAuth credentials in .env.local
# 4. Test real-time data sync
```

### **Level 3: Full Automation (2 hours)**
```bash
# 1. Connect multiple integrations
# 2. Add AI components to dashboard
# 3. Set up automated reports
# 4. Configure CRM hygiene rules
```

---

## 🔍 Troubleshooting Integration Issues

### **"Table doesn't exist" Error**
```sql
-- Check if new tables were created:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- If missing, run:
npm run db:setup
```

### **"Permission denied" Error**
```sql
-- Your RLS policies might need updating:
SELECT * FROM pg_policies WHERE tablename = 'deals';

-- Run the security policies migration:
supabase db push
```

### **"Webhook not working"**
```bash
# Check webhook endpoint:
curl -X OPTIONS http://localhost:3000/api/v1/webhooks/hubspot

# Should return 200 with CORS headers
```

### **"Redis connection failed" (Upstash Issues)**
```bash
# 1. Check Upstash connection details in .env.local:
cat .env.local | grep REDIS_URL

# 2. Test Upstash Redis connection:
# In your project, run this test:
node -e "
import { RedisUtils } from './lib/utils/redis-client.js';
RedisUtils.healthCheck().then(console.log);
"

# 3. Common Upstash issues:
#    - REDIS_URL format: redis://default:password@host:port
#    - Make sure to copy the full URL from Upstash dashboard
#    - Check database status in Upstash console

# 4. Fallback to local Redis (if needed):
#    Remove REDIS_URL from .env.local
#    Ensure local Redis is installed and running
```

---

## 🎯 What Changes vs What Stays the Same

### **✅ What STAYS THE SAME**
- Your existing UI components and pages
- Your current authentication flow  
- Your existing database data
- Your current API routes (they're preserved)
- Your current functionality (nothing breaks)

### **✅ What CHANGES (Adds New Features)**
- **Database**: +15 automation tables (existing data preserved)
- **API**: +10 new v1 endpoints (existing routes unchanged)  
- **UI**: Add AI scores, health metrics, real-time updates to existing pages
- **Features**: Real-time sync, AI insights, automation rules

---

## 🚀 Production Deployment Considerations

### **Environment Variables for Production**
```bash
# Add these to your production environment:
ANTHROPIC_API_KEY=your-production-claude-key
REDIS_URL=your-production-redis-url
JWT_SECRET=production-jwt-secret

# Integration secrets (encrypt in production):
SALESFORCE_CLIENT_ID=prod-client-id
SALESFORCE_CLIENT_SECRET=prod-client-secret
# ...etc for other integrations
```

### **Migration for Production**
```bash
# Run migrations in staging first:
supabase db push --target staging

# Then in production:
supabase db push --target production
```

---

## 🎉 Your App's New Automation Capabilities

### **Today (After Integration)**
✅ **Real-time data sync** from connected GTM tools  
✅ **AI-powered deal scoring** appears on your existing deal cards  
✅ **Automated risk detection** highlights at-risk deals  
✅ **Activity-based insights** show deal engagement patterns  
✅ **Canonical data model** unifies all your GTM data  

### **Next Week (With Additional Features)**
✅ **Automated weekly/monthly reports** leadership can view in-app  
✅ **CRM hygiene rules** automatically fix data issues  
✅ **Real-time dashboard updates** without page refresh  
✅ **Competitive intelligence** alerts and recommendations  
✅ **Forecast confidence scoring** for revenue planning  

---

## 🤝 Get Help

### **Common Integration Questions**
- **"Will this break my existing app?"** ❌ No, it only adds new features
- **"Do I need to migrate data?"** ❌ No, your data stays as-is
- **"Can I keep my existing components?"** ✅ Yes, they're preserved
- **"How do I add AI scores to my deals page?"** See code examples above
- **"What if I want to disable a feature?"** Simply don't connect that integration

### **Quick Test**
```bash
# Verify everything is working:
curl -X GET http://localhost:3000/api/v1/deals
# Should return 401 (needs auth), but proves endpoint exists

npm run type-check  
# Should complete without TypeScript errors
```

---

## 🏆 Ready!

Your existing Supabase-connected app now has the foundation for complete RevOps automation. The new features work alongside your current functionality, adding powerful intelligence and automation to eliminate the manual work RevOps teams do every day.

👉 **Next step: Choose an integration level above and start automating!**

---

# RevOps Automation Platform - Complete Integration Guide

**Transform your existing app into an intelligent automation platform** 🚀
