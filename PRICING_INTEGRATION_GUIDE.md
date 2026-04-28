# Pricing & Subscription Integration - Complete Guide

## ✅ What We Built

A complete pricing and subscription system that integrates with your RevOps AI Copilot product.

---

## 🗄️ Database Structure

### New Tables Added

**1. `subscriptions`**
- Tracks customer subscription details
- Columns: plan_tier, billing_cycle, status, trial dates, Stripe IDs
- Automatically created when customer signs up

**2. `usage_metrics`**
- Tracks monthly usage against plan limits
- Columns: records_count, ai_actions_count, users_count, crm_connections_count, agent_runs_count
- Resets monthly based on billing cycle

**3. `invoices`**
- Stores billing history
- Columns: stripe_invoice_id, amount, status, dates, PDF URLs
- Linked to subscriptions

**4. Updated `customers` table**
- Added: selected_plan, trial_started_at, trial_ends_at, onboarding_completed
- Maintains backward compatibility with existing subscription_tier column

### Database Functions

- `create_initial_subscription()` - Auto-creates subscription on customer signup
- `increment_usage()` - Increments usage counters
- `check_usage_limit()` - Validates if user can perform action

---

## 📋 Plan Configuration

### Four Tiers

| Plan | Price | Records | AI Actions | Users | CRM Connections |
|------|-------|---------|------------|-------|-----------------|
| **Free** | $0 | 100 | 100 | 1 | 1 |
| **Starter** | $99/mo ($79 annual) | 10K | 5K | 3 | 2 |
| **Professional** | $299/mo ($249 annual) | 100K | 50K | Unlimited | Unlimited |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Unlimited |

### Trial Policy
- Starter & Professional: 14-day free trial
- Free & Enterprise: No trial (Free is forever, Enterprise is custom)

Configuration file: `lib/subscription/plans.ts`

---

## 🔌 API Endpoints

### Subscription Management

**GET /api/subscription**
- Returns current subscription details
- Includes usage data and recent invoices

**GET /api/subscription/usage**
- Returns detailed usage metrics with limits
- Shows percentage used, exceeded status

**POST /api/subscription/upgrade**
- Changes plan tier
- Body: `{ planTier: 'starter', billingCycle: 'monthly' }`
- Returns checkout URL for paid plans

### Customer Creation

**POST /api/customer**
- Updated to accept `selectedPlan` parameter
- Automatically sets trial dates for paid plans
- Creates initial subscription and usage records

---

## 🎨 UI Components

### 1. Pricing Page (`app/pricing/page.tsx`)

**Features:**
- Monthly/Annual billing toggle with 20% discount
- Four pricing cards with gradients
- Feature comparison table
- FAQ accordion section
- Plan selection via URL: `/pricing?plan=starter`

**CTAs:**
- "Start Free Trial" for paid plans → `/signup?plan=starter`
- "Contact Sales" for Enterprise → `/contact`

### 2. Signup Flow (`app/signup/page.tsx`)

**New Features:**
- Reads `?plan=xxx` from URL query params
- Shows selected plan badge
- Passes plan to customer creation API
- Auto-starts 14-day trial for paid plans

### 3. Dashboard Components

**CurrentPlanCard** (`components/dashboard/CurrentPlanCard.tsx`)
- Shows current plan with icon/gradient
- Displays trial countdown
- "Trial ending soon" warning (3 days before)
- Quick upgrade link

**UsageTracker** (`components/dashboard/UsageTracker.tsx`)
- Progress bars for each metric
- Color-coded: green → yellow → amber → red
- "Unlimited" badge for professional+ features
- Shows billing period reset date
- Upgrade prompts when limits approached

---

## 🚀 User Flow

### Signup with Plan Selection

```
1. User lands on /pricing
   ↓
2. Clicks "Start 14-Day Trial" on Professional plan
   ↓
3. Redirected to /signup?plan=professional
   ↓
4. Sees "Professional Plan Selected" badge
   ↓
5. Creates account
   ↓
6. POST /api/customer with { email, selectedPlan: 'professional' }
   ↓
7. Database trigger creates:
   - Customer record with trial dates
   - Subscription record (status: 'trialing')
   - Usage metrics record (all counters at 0)
   ↓
8. Redirected to /onboarding
   ↓
9. Dashboard shows trial countdown
```

### Viewing Usage

```
Dashboard → Overview Tab → Usage Tracker Card

Shows:
- 245 / 10,000 records (2.5% used)
- 12 / 5,000 AI actions (0.24% used)
- 2 / 3 users (66.7% used)
- etc.

Color indicators:
- Green: < 70%
- Yellow: 70-89%
- Amber: 90-99%
- Red: 100%+ (exceeded)
```

### Upgrade Flow

```
Dashboard → "Upgrade Plan" button → /pricing

User selects higher tier → Signup flow (if not logged in)
OR → Checkout flow (Stripe integration - to be implemented)
```

---

## 🔒 Feature Gating (To Implement)

### Plan Limits Enforcement

**Where to Add Checks:**

1. **Before Sync** (`/api/sync`)
```typescript
const { allowed, current, limit } = await checkUsageLimit(customerId, 'records')
if (!allowed) {
  return NextResponse.json({ 
    error: 'Record limit exceeded',
    upgrade: true,
    current,
    limit
  }, { status: 402 })
}
```

2. **Before AI Query** (`/api/query`)
```typescript
await checkUsageLimit(customerId, 'aiActions')
```

3. **Before Agent Run** (`/api/agents/run`)
```typescript
await checkUsageLimit(customerId, 'agentRuns')
```

4. **After Action**
```typescript
await incrementUsage(customerId, 'aiActions', 1)
```

### Upgrade Prompts

When limit exceeded, show modal:
```
You've reached your record limit (10,000)
Upgrade to Professional for 100,000 records
[Upgrade Now] [Learn More]
```

---

## 💳 Stripe Integration (Next Steps)

### Setup Required

1. **Create Stripe Account** → stripe.com

2. **Create Products**
   - Starter ($99/mo, $79/mo annual)
   - Professional ($299/mo, $249/mo annual)

3. **Add Environment Variables**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
```

4. **Install Stripe SDK**
```bash
npm install stripe @stripe/stripe-js
```

5. **Create Checkout API** (`/api/billing/checkout`)
```typescript
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  line_items: [{ price: stripePriceId, quantity: 1 }],
  mode: 'subscription',
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
})
```

6. **Webhook Handler** (`/api/billing/webhooks`)
```typescript
// Listen to:
- checkout.session.completed → Activate subscription
- customer.subscription.updated → Update plan
- invoice.paid → Create invoice record
- customer.subscription.deleted → Cancel subscription
```

---

## 🧪 Testing Instructions

### Test Signup with Plan Selection

1. **Navigate to pricing page**
```
http://localhost:3002/pricing
```

2. **Click "Start 14-Day Trial" on Professional**
- Should redirect to `/signup?plan=professional`
- Badge should show "Professional Plan Selected"

3. **Create test account**
```
Email: test@example.com
Password: test123
```

4. **Verify in Supabase**
- Check `customers` table: selected_plan = 'professional'
- Check `subscriptions` table: plan_tier = 'professional', status = 'trialing'
- Check `usage_metrics` table: counters all at 0

5. **View dashboard**
- Should see "Professional Plan" card with trial countdown
- Should see "Usage This Month" with all metrics at 0%

### Test Usage Tracking

1. **Sync some data** (connect CRM or manual insert)
2. **Run AI agents** (`/api/agents/run`)
3. **Check usage tracker**
- Counters should increment
- Progress bars should update
- Colors should change as thresholds are crossed

### Test Upgrade Link

1. **Click "Upgrade" on Free plan card**
2. **Should redirect to /pricing**
3. **Select higher tier**
4. **(When Stripe implemented) Should show checkout**

---

## 📂 Files Created/Modified

### New Files
```
lib/subscription/
  ├── plans.ts                    # Plan configuration
  └── limits.ts                   # Usage checking functions

app/api/subscription/
  ├── route.ts                    # GET subscription details
  ├── usage/route.ts              # GET usage data
  └── upgrade/route.ts            # POST upgrade plan

components/dashboard/
  ├── CurrentPlanCard.tsx         # Current plan indicator
  └── UsageTracker.tsx            # Usage metrics display

supabase/migrations/
  └── 20250109120000_add_subscription_system.sql  # Database migration

PRICING_INTEGRATION_GUIDE.md    # This file
```

### Modified Files
```
app/pricing/page.tsx            # Pricing page (already existed)
app/signup/page.tsx             # Added plan selection
app/api/customer/route.ts       # Added plan handling
components/Dashboard.tsx        # Added new dashboard cards
app/page.tsx                    # Fixed pricing link
```

---

## 🎯 Success Criteria

✅ Pricing page accessible at /pricing
✅ Plan selection via URL params (?plan=starter)
✅ Signup captures selected plan
✅ Database creates subscription + usage records
✅ Dashboard shows current plan card
✅ Dashboard shows usage tracker
✅ Trial countdown visible
✅ Upgrade links functional

---

## 🚧 Next Phase: Payment Integration

**Week 1: Stripe Setup**
- [ ] Create Stripe account
- [ ] Set up products and prices
- [ ] Add Stripe SDK

**Week 2: Checkout Flow**
- [ ] Build checkout API
- [ ] Create customer portal link
- [ ] Add payment method UI

**Week 3: Webhooks**
- [ ] Implement webhook handler
- [ ] Test subscription lifecycle
- [ ] Add retry logic

**Week 4: Feature Gating**
- [ ] Add limit checks to all APIs
- [ ] Build upgrade modals
- [ ] Test enforcement

---

## 💡 Tips

1. **Test with different plans** - Create multiple accounts with different plan selections
2. **Check database** - Use Supabase dashboard to verify subscriptions created correctly
3. **Monitor trial expirations** - Test with shorter trial periods (e.g., 1 day) for faster testing
4. **Simulate usage** - Manually increment usage_metrics to test progress bars and limits

---

## 📞 Support

All code is fully typed with TypeScript and includes error handling. Check browser console and server logs for debugging.

**Key Log Points:**
- Customer creation: `POST /api/customer`
- Subscription fetch: `GET /api/subscription`
- Usage fetch: `GET /api/subscription/usage`

---

## 🎉 You're Done!

The pricing integration is complete and ready for testing. Once Stripe is integrated, you'll have a fully functional SaaS billing system!
