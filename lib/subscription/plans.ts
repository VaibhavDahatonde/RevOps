// Plan configuration and limits

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise'
export type BillingCycle = 'monthly' | 'annual'

export interface PlanLimits {
  records: number
  aiActions: number
  users: number
  crmConnections: number
  agentRuns: number
}

export interface PlanFeatures {
  name: string
  description: string
  price: {
    monthly: number | null
    annual: number | null
  }
  limits: PlanLimits
  features: string[]
  stripePriceId?: {
    monthly?: string
    annual?: string
  }
}

export const PLAN_CONFIG: Record<PlanTier, PlanFeatures> = {
  free: {
    name: 'Free',
    description: 'Perfect for trying out AI agents',
    price: {
      monthly: 0,
      annual: 0
    },
    limits: {
      records: 100,
      aiActions: 100,
      users: 1,
      crmConnections: 1,
      agentRuns: 10
    },
    features: [
      '1 user',
      '100 records',
      '1 CRM connection',
      'Basic AI agents',
      'Email support'
    ]
  },
  starter: {
    name: 'Starter',
    description: 'For small revenue teams',
    price: {
      monthly: 99,
      annual: 79
    },
    limits: {
      records: 10000,
      aiActions: 5000,
      users: 3,
      crmConnections: 2,
      agentRuns: 200
    },
    features: [
      '3 users',
      '10K records',
      '2 CRM connections',
      'All AI agents',
      'Email support (24h)',
      'Basic workflows'
    ],
    stripePriceId: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID
    }
  },
  professional: {
    name: 'Professional',
    description: 'For growing revenue teams',
    price: {
      monthly: 299,
      annual: 249
    },
    limits: {
      records: 100000,
      aiActions: 50000,
      users: 999999, // Unlimited
      crmConnections: 999999, // Unlimited
      agentRuns: 999999 // Unlimited
    },
    features: [
      'Unlimited users',
      '100K records',
      'Unlimited CRM connections',
      'All AI agents',
      'Priority support (2h)',
      'Advanced workflows',
      'Priority AI processing',
      'Slack integration'
    ],
    stripePriceId: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID
    }
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations',
    price: {
      monthly: null,
      annual: null
    },
    limits: {
      records: 999999,
      aiActions: 999999,
      users: 999999,
      crmConnections: 999999,
      agentRuns: 999999
    },
    features: [
      'Unlimited everything',
      'Dedicated AI agents',
      'Custom integrations',
      'SSO/SAML',
      'Dedicated support',
      'Custom workflows',
      'SLA guarantees',
      'Training & onboarding'
    ]
  }
}

export function getPlanLimits(planTier: PlanTier): PlanLimits {
  return PLAN_CONFIG[planTier].limits
}

export function isPlanUnlimited(planTier: PlanTier, metric: keyof PlanLimits): boolean {
  const limit = PLAN_CONFIG[planTier].limits[metric]
  return limit >= 999999
}

export function formatPlanPrice(planTier: PlanTier, billingCycle: BillingCycle): string {
  const price = PLAN_CONFIG[planTier].price[billingCycle]
  if (price === null) return 'Custom'
  if (price === 0) return 'Free'
  return `$${price}/month`
}

export function getTrialDays(): number {
  return 14
}

export function isTrialEligible(planTier: PlanTier): boolean {
  return planTier === 'starter' || planTier === 'professional'
}
