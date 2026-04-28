# AI Agents System - Complete Guide

## 🎯 What We Built

A **production-ready, compliant AI agent system** that automatically fixes revenue problems instead of just reporting them.

### The Transformation

**Before:** Insight-only dashboard (shows problems, user does nothing)  
**After:** Insight → Recommendation → Action → Automation (AI fixes problems automatically)

---

## 🤖 AI Agents Overview

### 1. **Data Hygiene Agent** 🧹
**Purpose:** Auto-fix missing CRM fields and improve data quality

**Actions:**
- ✅ Predicts and fills missing close dates (using AI + historical data)
- ✅ Estimates missing deal amounts (based on averages)
- ✅ Sets default stages for new deals
- ✅ Calculates missing probability percentages

**Impact:** ↑ Pipeline hygiene score, ↑ CRM completeness, better forecasting accuracy

### 2. **Deal Risk Agent** ⚠️
**Purpose:** Proactively identify and intervene on at-risk deals

**Actions:**
- ✅ Sends alerts for stale deals (no activity 14+ days)
- ✅ Flags deals stuck in pipeline stage too long
- ✅ Warns about last-minute deals closing with low engagement
- ✅ Creates tasks to update overdue deals
- ✅ Escalates high-risk situations

**Impact:** ↓ Slipped deals, ↑ Win rate, faster response to problems

### 3. **Forecast Agent** 📊
**Purpose:** Auto-adjust forecasts based on deal velocity and risk

**Actions:**
- ✅ Pushes close dates for overdue deals (realistic timeline)
- ✅ Reduces probability for high-risk deals
- ✅ Flags deals unlikely to close
- ✅ Adjusts forecast automatically

**Impact:** ↑ Forecast accuracy, fewer surprises at quarter-end

---

## 🏗️ System Architecture

### Database Tables (Compliance Layer)

**1. `automated_actions`** - Full audit trail
```sql
- Logs every action AI takes
- Stores old/new values for rollback
- Tracks confidence scores
- Records why each action was taken
- Supports approval workflows
```

**2. `agent_runs`** - Execution history
```sql
- Tracks each agent run
- Records performance metrics
- Stores execution time
- Logs errors and impact
```

**3. `impact_metrics`** - Success tracking
```sql
- Pipeline hygiene scores
- Forecast accuracy %
- Risk management stats
- Velocity improvements
- Overall ROI metrics
```

### Safety Features ✅

1. **Confidence Thresholds:** Actions only execute if confidence >= 60%
2. **Audit Logging:** Every action logged with reason + old/new values
3. **Rollback Capability:** Can undo field changes
4. **Approval Workflows:** Optional human approval for sensitive actions
5. **Row Level Security:** All tables protected by Supabase RLS

---

## 📁 File Structure

```
lib/agents/
├── base-agent.ts           # Core agent framework
├── data-hygiene-agent.ts   # Data quality agent
├── deal-risk-agent.ts      # Risk management agent
├── forecast-agent.ts       # Forecasting agent
└── index.ts                # Orchestrator (run all agents)

app/api/agents/
├── run/route.ts            # Trigger agents manually
├── actions/route.ts        # View/rollback actions
└── impact/route.ts         # Get impact metrics

components/
├── AIAgentImpact.tsx       # Impact dashboard widget
└── AgentActivityLog.tsx    # Recent actions viewer

supabase/migrations/
└── 20250109000000_add_agent_system.sql  # Database schema
```

---

## 🚀 Setup Instructions

### Step 1: Push Migration to Supabase

```bash
# Make sure Supabase CLI is installed
npm install -g supabase

# Login (if not already)
supabase login

# Link your project (if not already)
supabase link --project-ref your-project-ref

# Push the new migration
supabase db push

# Or use npm script
npm run supabase:push
```

**What it creates:**
- ✅ `automated_actions` table
- ✅ `agent_runs` table
- ✅ `impact_metrics` table
- ✅ RLS policies for all tables
- ✅ Indexes for performance

### Step 2: Restart Dev Server

```bash
npm run dev
```

### Step 3: Test the System

1. **Login to your app** (http://localhost:3000)
2. **Go to Dashboard** - You'll see new "AI Agent Impact" card
3. **Click "Run AI Agents"** - This triggers all agents
4. **Watch the magic happen:**
   - Missing fields get filled
   - Alerts created for risky deals
   - Close dates adjusted
   - Activity log shows all actions

---

## 🎮 How to Use

### Manual Trigger (Dashboard UI)
```
1. Open dashboard
2. Find "AI Agent Impact" widget
3. Click "Run AI Agents" button
4. Wait for completion (~5-30 seconds)
5. See results in activity log
```

### API Trigger (Programmatic)
```typescript
// Run all agents
POST /api/agents/run
Body: {}

// Run specific agent
POST /api/agents/run
Body: { "agentType": "data_hygiene" }

// Get agent history
GET /api/agents/run

// View all actions
GET /api/agents/actions?limit=50

// Get impact metrics
GET /api/agents/impact

// Rollback an action
POST /api/agents/actions/rollback
Body: { "actionId": "uuid" }
```

### Future: Automated Scheduling (Cron)

**Option A: Vercel Cron (Production)**
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/agents/run",
    "schedule": "0 */6 * * *"  // Every 6 hours
  }]
}
```

**Option B: External Cron (Any hosting)**
```bash
# Add to crontab
0 */6 * * * curl -X POST https://your-app.vercel.app/api/agents/run
```

---

## 📊 Success Metrics

### Track These KPIs

| Metric | Where to Find | Target |
|--------|--------------|---------|
| Pipeline Hygiene Score | AI Agent Impact widget | > 85% |
| Fields Auto-Filled | Activity log | Track weekly |
| Alerts Sent | Impact metrics | Track trend |
| High-Risk Deals | Dashboard | Decrease over time |
| Forecast Adjustments | Agent activity | Track accuracy |
| Actions Last 7 Days | Impact widget | Increasing usage |

### Prove ROI to Stakeholders

```
"AI Agents have:
✅ Auto-filled 143 missing CRM fields (20 hours saved)
✅ Sent 27 proactive alerts preventing deal slip
✅ Adjusted 15 overdue forecasts for accuracy
✅ Improved pipeline hygiene from 62% to 89%
```

---

## 🔧 Customization

### Add a New Agent

```typescript
// lib/agents/my-custom-agent.ts
import { BaseAgent, AgentAction } from './base-agent'

export class MyCustomAgent extends BaseAgent {
  constructor(customerId: string) {
    super(customerId, 'my_agent', false)
  }

  async analyze(): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    
    // Your logic here
    // Example: Find deals without next steps
    const opportunities = await this.getOpportunities()
    
    for (const opp of opportunities) {
      // Create action
      actions.push({
        type: 'send_alert',
        targetType: 'opportunity',
        targetId: opp.id,
        description: 'Custom action description',
        reason: 'Why this action is needed',
        confidence: 85,
      })
    }
    
    return actions
  }
}

// Register in lib/agents/index.ts
export { MyCustomAgent } from './my-custom-agent'
```

### Adjust Confidence Thresholds

```typescript
// lib/agents/base-agent.ts
protected validateAction(action: AgentAction): boolean {
  // Change from 60 to your threshold
  if (action.confidence < 70) {  // <-- Higher threshold
    return false
  }
  return true
}
```

### Add Approval Workflow

```typescript
// Set requiresApproval = true in agent constructor
export class DataHygieneAgent extends BaseAgent {
  constructor(customerId: string) {
    super(customerId, 'data_hygiene', true)  // <-- Requires approval
  }
}

// Actions will have status: 'pending_approval'
// Build UI to approve/reject actions
```

---

## 🐛 Troubleshooting

### "Agent run failed"
**Check:**
1. Migration pushed to Supabase? (`supabase db push`)
2. Tables exist? (Check Supabase dashboard → Table Editor)
3. RLS policies active? (Should auto-apply with migration)
4. Gemini API key set? (Check `.env`)

### "No actions taken"
**Reasons:**
- All data is already clean (good!)
- No high-risk deals (also good!)
- Confidence threshold too high
- Check agent_runs table for details

### "Actions not appearing in UI"
**Check:**
1. Browser console for errors
2. API endpoint responding? (`/api/agents/actions`)
3. Customer ID matching logged-in user?

---

## 🔐 Security & Compliance

### Data Privacy
- ✅ All agent actions scoped to customer_id
- ✅ Row Level Security prevents cross-customer access
- ✅ No PII exposed in logs

### Audit Trail
- ✅ Every action logged with timestamp
- ✅ Old values preserved for rollback
- ✅ Confidence scores recorded
- ✅ Can export audit logs

### Rollback Safety
- ✅ Field updates can be reverted
- ✅ Alerts/tasks don't affect CRM directly
- ✅ Manual approval option available

---

## 🚀 Next Steps

### Phase 1: Test & Iterate (This Week)
- [ ] Push migration to Supabase
- [ ] Run agents on real data
- [ ] Review actions in activity log
- [ ] Adjust confidence thresholds

### Phase 2: Add Automation (Next Week)
- [ ] Set up Vercel Cron for 6-hour runs
- [ ] Add Slack/email notifications
- [ ] Build approval workflow UI
- [ ] Add more custom agents

### Phase 3: Scale & Optimize (Month 2)
- [ ] Add more action types (schedule meetings, update CRM directly)
- [ ] Connect to HubSpot API for writes
- [ ] Build analytics dashboard
- [ ] Add AI learning from feedback

---

## 💡 Key Differentiators

**What makes this system "game-changing":**

1. **Actions over Insights:** Doesn't just show problems, fixes them
2. **Compliance-First:** Full audit trail, rollback, approval workflows
3. **Confidence-Based:** Only acts when confident (60%+ threshold)
4. **Measurable Impact:** Tracks hygiene, accuracy, risk metrics
5. **Production-Ready:** RLS, error handling, performance indexes

**Customer POV:**
> "This isn't another dashboard. It's an AI teammate that cleans my CRM, catches slipping deals, and keeps my forecast accurate - automatically."

---

## 📞 Support

Questions or need help customizing? The system is fully documented with:
- Type-safe TypeScript throughout
- Detailed code comments
- Error handling and logging
- Extensible base classes

**Happy automating! 🚀**
