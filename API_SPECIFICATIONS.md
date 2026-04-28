# API Specifications for RevOps Automation Platform

## Overview
Comprehensive API documentation for all major modules of the RevOps platform. Includes authentication, data access, real-time updates, and AI-powered features.

## Authentication & Authorization

### Base URL
```
Production: https://api.revops-platform.com/v1
Development: http://localhost:3000/api/v1
```

### Authentication Methods

#### API Key Authentication
```http
Authorization: Bearer <api_key>
X-Customer-ID: <customer_id>
```

#### Session Authentication (Frontend)
```http
Cookie: auth_token=<jwt_token>
X-Customer-ID: <customer_id>
```

### Rate Limiting
- **Standard**: 1000 requests/hour per customer
- **Premium**: 5000 requests/hour per customer  
- **Enterprise**: 10,000 requests/hour per customer

---

## 1. Integrations API

### Get Available Integrations
```http
GET /integrations
```

**Response:**
```json
{
  "data": [
    {
      "slug": "salesforce",
      "name": "Salesforce",
      "description": "Connect your Salesforce CRM",
      "logo": "https://cdn.revops.com/logos/salesforce.svg",
      "capabilities": ["deals", "accounts", "contacts", "activities"],
      "authType": "oauth2",
      "status": "available"
    },
    {
      "slug": "hubspot",
      "name": "HubSpot",
      "description": "Connect your HubSpot CRM",
      "logo": "https://cdn.revops.com/logos/hubspot.svg",
      "capabilities": ["deals", "accounts", "contacts", "activities", "campaigns"],
      "authType": "oauth2",
      "status": "available"
    }
  ]
}
```

### Initiate OAuth Connection
```http
POST /integrations/{provider}/connect
```

**Request Body:**
```json
{
  "redirectUri": "https://app.revops.com/integrations/callback",
  "scopes": ["api", "refresh_token"]
}
```

**Response:**
```json
{
  "data": {
    "authUrl": "https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=...",
    "state": "abc123",
    "expiresAt": "2024-01-01T10:00:00Z"
  }
}
```

### Handle OAuth Callback
```http
GET /integrations/{provider}/callback
```

**Query Parameters:**
- `code`: Authorization code
- `state`: State from initial request
- `error`: Error (if any)

**Response:**
```json
{
  "success": true,
  "integrationId": "int_123456789",
  "status": "connected"
}
```

### Get Connected Integrations
```http
GET /integrations/connected
```

**Response:**
```json
{
  "data": [
    {
      "id": "int_123456789",
      "provider": "salesforce",
      "name": "Salesforce",
      "status": "active",
      "lastSyncAt": "2024-01-15T10:30:00Z",
      "syncStatus": "success",
      "configuredEvents": [" Opportunity.Created", "Opportunity.Updated"],
      "metrics": {
        "eventsProcessed": 15234,
        "lastError": null
      }
    }
  ]
}
```

### Sync Integration Data
```http
POST /integrations/{integrationId}/sync
```

**Request Body:**
```json
{
  "fullSync": false,
  "dateRange": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "entityTypes": ["deals", "accounts"]
}
```

**Response:**
```json
{
  "jobId": "job_123456789",
  "status": "queued",
  "estimatedDuration": "5-10 minutes"
}
```

### Get Sync Status
```http
GET /integrations/{integrationId}/sync/{jobId}
```

**Response:**
```json
{
  "jobId": "job_123456789",
  "status": "processing",
  "progress": {
    "total": 15000,
    "processed": 8500,
    "percentage": 56.7
  },
  "entities": {
    "deals": { "total": 5000, "processed": 3200 },
    "accounts": { "total": 3000, "processed": 2800 },
    "contacts": { "total": 7000, "processed": 2500 }
  },
  "errors": [
    {
      "entityType": "contacts",
      "entityId": "003123456789",
      "error": "Permission denied for this record"
    }
  ],
  "startedAt": "2024-01-15T11:00:00Z",
  "estimatedCompletionAt": "2024-01-15T11:08:00Z"
}
```

---

## 2. Deals API

### Get Deals
```http
GET /deals
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25, max: 100)
- `stage[]`: Filter by stage(s)
- `owner`: Filter by owner ID
- `account`: Filter by account ID
- `dateRange.from`: Filter by close date from
- `dateRange.to`: Filter by close date to
- `search`: Search in name or description

**Response:**
```json
{
  "data": [
    {
      "id": "deal_123456789",
      "name": "Enterprise Software Deal",
      "amount": 250000.00,
      "currency": "USD",
      "stage": "Proposal",
      "probability": 75,
      "closeDate": "2024-03-31",
      "createdDate": "2024-01-15",
      "daysInStage": 12,
      "owner": {
        "id": "user_123456789",
        "name": "John Smith",
        "email": "john@company.com"
      },
      "account": {
        "id": "acc_123456789",
        "name": "ACME Corporation",
        "industry": "Technology"
      },
      "healthScore": 82,
      "riskFactors": ["long_sales_cycle", "competitor_present"],
      "lastActivityDate": "2024-01-20",
      "nextStep": "Executive demo on Feb 1",
      "forecastCategory": "best_case",
      "sourceSystem": "salesforce",
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "stages": ["Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"],
    "owners": [
      { "id": "user_123456789", "name": "John Smith" },
      { "id": "user_234567890", "name": "Jane Doe" }
    ]
  }
}
```

### Get Single Deal
```http
GET /deals/{dealId}
```

**Response:**
```json
{
  "data": {
    "id": "deal_123456789",
    "name": "Enterprise Software Deal",
    "amount": 250000.00,
    "currency": "USD",
    "stage": "Proposal",
    "probability": 75,
    "closeDate": "2024-03-31",
    // ... basic fields
    "account": {
      "id": "acc_123456789",
      "name": "ACME Corporation",
      "industry": "Technology",
      "size": "Enterprise",
      "arr": 1500000.00,
      "healthScore": 85
    },
    "contacts": [
      {
        "id": "con_123456789",
        "name": "Sarah Johnson",
        "title": "VP of Engineering",
        "email": "sarah@acme.com",
        "isDecisionMaker": true
      }
    ],
    "activities": [
      {
        "id": "act_123456789",
        "type": "MEETING",
        "subtype": "COMPLETED",
        "subject": "Technical deep dive",
        "date": "2024-01-18T10:00:00Z",
        "duration": 60,
        "engagementScore": 8
      }
    ],
    "aiInsights": [
      {
        "id": "insight_123456789",
        "type": "RISK",
        "title": "Long stagnation in current stage",
        "description": "Deal has been in Proposal stage for 12 days, which is 3x longer than average",
        "severity": "MEDIUM",
        "recommendation": "Schedule executive demo to accelerate deal",
        "confidence": 0.89
      }
    ],
    "similarDeals": [
      {
        "id": "deal_987654321",
        "name": "Similar enterprise deal",
        "amount": 225000.00,
        "stage": "Closed Won",
        "closeDate": "2023-11-15",
        "salesCycleDays": 65
      }
    ]
  }
}
```

### Update Deal Fields
```http
PATCH /deals/{dealId}
```

**Request Body:**
```json
{
  "stage": "Negotiation",
  "probability": 90,
  "closeDate": "2024-04-15",
  "amount": 275000.00,
  "nextStep": "Legal review and contract preparation"
}
```

**Response:**
```json
{
  "data": {
    "id": "deal_123456789",
    "updatedAt": "2024-01-25T09:15:00Z",
    "changes": {
      "stage": { "from": "Proposal", "to": "Negotiation" },
      "probability": { "from": 75, "to": 90 },
      "closeDate": { "from": "2024-03-31", "to": "2024-04-15" }
    }
  }
}
```

---

## 3. Accounts API

### Get Accounts
```http
GET /accounts
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `industry`: Filter by industry
- `tier`: Filter by tier (FREE, GROWTH, PRO, ENTERPRISE)
- `lifecycleStage`: Filter by lifecycle stage
- `healthScore.min`: Minimum health score
- `healthScore.max`: Maximum health score
- `search`: Search in name or domain

**Response:**
```json
{
  "data": [
    {
      "id": "acc_123456789",
      "name": "ACME Corporation",
      "domain": "acme.com",
      "industry": "Technology",
      "size": "Enterprise",
      "tier": "Enterprise",
      "arr": 1500000.00,
      "healthScore": 85,
      "lifecycleStage": "Active",
      "billingStatus": "Active",
      "owner": {
        "id": "user_123456789",
        "name": "John Smith"
      },
      "metrics": {
        "activeDeals": 3,
        "pipelineAmount": 450000.00,
        "closedWonAmount": 890000.00,
        "openTickets": 2,
        "lastActivityDate": "2024-01-20"
      },
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  ]
}
```

### Get Account Health Summary
```http
GET /accounts/{accountId}/health
```

**Response:**
```json
{
  "data": {
    "overallScore": 85,
    "components": {
      "engagement": { "score": 90, "weight": 0.3 },
      "productUsage": { "score": 82, "weight": 0.4 },
      "support": { "score": 88, "weight": 0.2 },
      "billing": { "score": 95, "weight": 0.1 }
    },
    "trends": {
      "score": {
        "current": 85,
        "previousMonth": 87,
        "threeMonthsAgo": 82,
        "direction": "decreasing"
      },
      "usage": {
        "current": "high",
        "trend": "stable"
      }
    },
    "riskFactors": [
      {
        "factor": "decreasing_usage",
        "severity": "medium",
        "description": "Monthly active users decreased 15% this month"
      }
    ],
    "recommendations": [
      {
        "type": "outreach",
        "description": "Schedule customer success check-in to address usage concerns"
      }
    ]
  }
}
```

---

## 4. Metrics API

### Get Pipeline Metrics
```http
GET /metrics/pipeline
```

**Query Parameters:**
- `period`: DAILY, WEEKLY, MONTHLY, QUARTERLY
- `dateRange.from`: Start date
- `dateRange.to`: End date
- `owners[]`: Filter by owner IDs
- `stages[]`: Filter by stages

**Response:**
```json
{
  "data": {
    "summary": {
      "totalPipeline": 8750000.00,
      "weightedPipeline": 5250000.00,
      "dealCount": 142,
      "averageDealSize": 61619.72,
      "pipelineCoverage": 3.5
    },
    "byStage": [
      {
        "stage": "Qualified",
        "amount": 1250000.00,
        "dealCount": 25,
        "percentage": 14.3,
        "averageDaysInStage": 18
      },
      {
        "stage": "Proposal",
        "amount": 2875000.00,
        "dealCount": 45,
        "percentage": 32.9,
        "averageDaysInStage": 22
      }
    ],
    "byOwner": [
      {
        "owner": {
          "id": "user_123456789",
          "name": "John Smith"
        },
        "pipeline": 3250000.00,
        "dealCount": 52,
        "quotaAttainment": 1.08
      }
    ],
    "trends": [
      {
        "period": "2024-01-01",
        "pipeline": 9250000.00,
        "dealCount": 156
      },
      {
        "period": "2024-01-08",
        "pipeline": 8750000.00,
        "dealCount": 142
      }
    ]
  }
}
```

### Get Forecast Metrics
```http
GET /metrics/forecast
```

**Query Parameters:**
- `period`: CURRENT_QUARTER, NEXT_QUARTER, CURRENT_YEAR, NEXT_YEAR
- `ownerId`: Filter by specific owner
- `category`: COMMIT, BEST_CASE, PIPELINE

**Response:**
```json
{
  "data": {
    "period": {
      "type": "CURRENT_QUARTER",
      "startDate": "2024-01-01",
      "endDate": "2024-03-31"
    },
    "forecast": {
      "commit": 2500000.00,
      "bestCase": 3250000.00,
      "pipeline": 4875000.00
    },
    "teamQuota": 3000000.00,
    "attainment": {
      "commit": 0.83,
      "bestCase": 1.08
    },
    "riskFactors": [
      {
        "type": "concentration_risk",
        "description": "48% of pipeline relies on top 3 deals",
        "impact": "high",
        "dealIds": ["deal_123", "deal_456", "deal_789"]
      }
    ],
    "recommendations": [
      {
        "type": "pipeline_generation",
        "description": "Focus on mid-sized deals to reduce concentration risk",
        "priority": "high"
      }
    ]
  }
}
```

### Get Activity Metrics
```http
GET /metrics/activity
```

**Response:**
```json
{
  "data": {
    "summary": {
      "totalActivities": 2847,
      "meetings": 342,
      "calls": 567,
      "emails": 1823,
      "tasks": 115
    },
    "engagementMetrics": {
      "averageEngagementScore": 7.2,
      "responseRate": 0.68,
      "averageResponseTime": "4.2 hours",
      "meetingAttendance": 0.92
    },
    "byRep": [
      {
        "rep": {
          "id": "user_123456789",
          "name": "John Smith"
        },
        "activities": 342,
        "engagement": 8.1,
        "conversionRate": 0.23
      }
    ],
    "trends": [
      {
        "date": "2024-01-20",
        "activities": 127,
        "engagement": 7.4
      }
    ]
  }
}
```

---

## 5. AI Insights API

### Get AI Insights
```http
GET /insights
```

**Query Parameters:**
- `type`: RISK, OPPORTUNITY, TREND, ANOMALY
- `entityType`: DEAL, ACCOUNT, REP, TEAM
- `severity`: LOW, MEDIUM, HIGH, CRITICAL
- `status`: ACTIVE, ACKNOWLEDGED, RESOLVED
- `page`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "insight_123456789",
      "type": "RISK",
      "title": "Deal stagnation detected",
      "description": "Enterprise deal has been in Proposal stage for 18 days without activity",
      "severity": "HIGH",
      "confidence": 0.92,
      "impact": 8,
      "entityType": "DEAL",
      "entityId": "deal_123456789",
      "entityName": "ACME Corporation - Enterprise Deal",
      "recommendation": "Schedule executive meeting to re-engage decision makers",
      "actionItems": [
        "Calendar meeting with VP of Engineering",
        "Send updated proposal with updated pricing",
        "Check for competitive activity"
      ],
      "supportingData": {
        "daysInStage": 18,
        "averageDaysInStage": 8,
        "lastActivityDate": "2024-01-02",
        "dealAmount": 250000.00
      },
      "modelUsed": "claude-3-sonnet-v1.2",
      "createdAt": "2024-01-20T14:30:00Z",
      "status": "ACTIVE"
    }
  ],
  "summary": {
    "total": 23,
    "bySeverity": {
      "CRITICAL": 2,
      "HIGH": 8,
      "MEDIUM": 10,
      "LOW": 3
    },
    "byType": {
      "RISK": 15,
      "OPPORTUNITY": 5,
      "TREND": 3,
      "ANOMALY": 0
    }
  }
}
```

### Acknowledge Insight
```http
POST /insights/{insightId}/acknowledge
```

**Request Body:**
```json
{
  "notes": "Will schedule meeting with decision makers this week",
  "action": "SCHEDULED_CALL"
}
```

**Response:**
```json
{
  "data": {
    "id": "insight_123456789",
    "status": "ACKNOWLEDGED",
    "acknowledgedAt": "2024-01-25T10:30:00Z",
    "acknowledgedBy": {
      "id": "user_123456789",
      "name": "John Smith"
    },
    "notes": "Will schedule meeting with decision makers this week",
    "action": "SCHEDULED_CALL"
  }
}
```

### Generate Deal Summary
```http
POST /insights/generate/deal-summary
```

**Request Body:**
```json
{
  "dealId": "deal_123456789",
  "format": "executive_summary"
}
```

**Response:**
```json
{
  "data": {
    "summary": "ACME Corporation is a $250K enterprise deal currently in Proposal stage with 75% probability. Key highlights include strong technical fit and executive support, with primary risk being extended timeline due to budget cycle. Recommend fast-tracking through executive champion.",
    "keyPoints": [
      "Strong product fit with engineering requirements",
      "Economic buyer identified and supportive",
      "Competitor Oracle present in current stack",
      "Budget approval pending next cycle (2 weeks)"
    ],
    "nextBestActions": [
      "Secure executive sponsor testimonial",
      "Provide competitive comparison sheet",
      "Schedule CFO introduction"
    ],
    "winProbability": 0.78,
    "confidence": 0.85,
    "generatedAt": "2024-01-25T10:30:00Z"
  }
}
```

---

## 6. Reports API

### Get Available Reports
```http
GET /reports/templates
```

**Response:**
```json
{
  "data": [
    {
      "id": "weekly_leadership",
      "name": "Weekly Leadership Report",
      "description": "Comprehensive weekly overview for executive team",
      "type": "WEEKLY",
      "sections": ["pipeline_health", "forecast_analysis", "team_performance", "risk_alerts"],
      "format": ["PDF", "PPTX", "HTML"],
      "schedule": "every_monday_9am"
    },
    {
      "id": "monthly_board",
      "name": "Monthly Board Report",
      "description": "Detailed monthly metrics for board presentation",
      "type": "MONTHLY",
      "sections": ["revenue_overview", "customer_metrics", "operational_kpis"],
      "format": ["PDF", "PPTX"],
      "schedule": "first_monday_9am"
    }
  ]
}
```

### Generate Report
```http
POST /reports/generate
```

**Request Body:**
```json
{
  "templateId": "weekly_leadership",
  "period": {
    "from": "2024-01-15",
    "to": "2024-01-21"
  },
  "format": "PDF",
  "delivery": {
    "channels": ["email", "slack"],
    "recipients": ["ceo@company.com", "board@company.com"],
    "slackChannel": "#leadership"
  },
  "customSections": [
    {
      "type": "custom_insights",
      "title": "Q1 Pipeline Analysis",
      "focus": ["enterprise_deals", "new_logo_acquisition"]
    }
  ]
}
```

**Response:**
```json
{
  "jobId": "job_123456789",
  "status": "generating",
  "estimatedTime": "2-3 minutes",
  "delivery": {
    "email": {
      "status": "pending",
      "recipients": ["ceo@company.com"]
    },
    "slack": {
      "status": "pending",
      "channel": "#leadership"
    }
  }
}
```

### Get Report Status
```http
GET /reports/{jobId}/status
```

**Response:**
```json
{
  "jobId": "job_123456789",
  "status": "completed",
  "completedAt": "2024-01-25T10:33:00Z",
  "generationTime": 185000,
  "output": {
    "url": "https://cdn.revops.com/reports/report_123456789.pdf",
    "size": "2.4MB",
    "format": "PDF",
    "expiresAt": "2024-02-25T10:33:00Z"
  },
  "delivery": {
    "email": {
      "status": "sent",
      "sentAt": "2024-01-25T10:34:00Z",
      "recipients": ["ceo@company.com"]
    },
    "slack": {
      "status": "posted",
      "postedAt": "2024-01-25T10:34:00Z",
      "channel": "#leadership",
      "messageUrl": "https://slack.com/archives/C123456/p1706177670"
    }
  },
  "metadata": {
    "sectionsGenerated": 12,
    "chartsGenerated": 8,
    "aiInsightsUsed": 15,
    "dataPointsProcessed": 2847
  }
}
```

### Get Report History
```http
GET /reports/history
```

**Query Parameters:**
- `templateId`: Filter by template
- `period.from`: From date
- `period.to`: To date
- `status`: Filter by status
- `page`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "report_123456789",
      "templateId": "weekly_leadership",
      "templateName": "Weekly Leadership Report",
      "period": {
        "from": "2024-01-15",
        "to": "2024-01-21"
      },
      "status": "completed",
      "format": "PDF",
      "generatedAt": "2024-01-25T10:33:00Z",
      "deliveredAt": "2024-01-25T10:34:00Z",
      "downloadUrl": "https://cdn.revops.com/reports/report_123456789.pdf",
      "deliveryChannels": ["email", "slack"],
      "metadata": {
        "size": "2.4MB",
        "generationTime": "3 minutes",
        "recipients": 5
      }
    }
  ]
}
```

---

## 7. CRM Hygiene API

### Get Hygiene Issues
```http
GET /hygiene/issues
```

**Query Parameters:**
- `entityType`: Deal, Account, Contact
- `severity`: Low, Medium, High, Critical
- `status`: Open, In Progress, Resolved
- `ruleType`: Field validation, Business rule, Data quality

**Response:**
```json
{
  "data": [
    {
      "id": "issue_123456789",
      "ruleId": "rule_456789",
      "ruleName": "Missing next step on deals",
      "entityType": "DEAL",
      "entityId": "deal_123456789",
      "entityName": "ACME Corporation - Enterprise Deal",
      "severity": "HIGH",
      "description": "Deal in Negotiation stage has no next step defined",
      "recommendation": "Add next step action and due date",
      "autoFixAvailable": true,
      "autoFixPreview": "Set next step to 'Contract preparation' with due date in 7 days",
      "status": "OPEN",
      "detectedAt": "2024-01-25T09:00:00Z",
      "impact": {
        "dealAmount": 250000.00,
        "riskLevel": "HIGH"
      }
    }
  ],
  "summary": {
    "totalIssues": 47,
    "bySeverity": {
      "CRITICAL": 3,
      "HIGH": 12,
      "MEDIUM": 25,
      "LOW": 7
    },
    "byEntityType": {
      "DEAL": 28,
      "ACCOUNT": 12,
      "CONTACT": 7
    },
    "autoFixable": 19
  }
}
```

### Apply Auto-Fix
```http
POST /hygiene/issues/{issueId}/fix
```

**Request Body:**
```json
{
  "confirmAutoFix": true,
  "dryRun": false,
  "notes": "Applied recommended fix"
}
```

**Response:**
```json
{
  "data": {
    "issueId": "issue_123456789",
    "status": "RESOLVED",
    "resolvedAt": "2024-01-25T10:30:00Z",
    "changes": {
      "fields": ["nextStep", "nextStepDueDate"],
      "values": {
        "nextStep": "Contract preparation",
        "nextStepDueDate": "2024-02-01"
      }
    },
    "appliedBy": {
      "type": "AUTO_FIX",
      "ruleId": "rule_456789"
    }
  }
}
```

### Get Hygiene Rules
```http
GET /hygiene/rules
```

**Response:**
```json
{
  "data": [
    {
      "id": "rule_456789",
      "name": "Missing next step on deals",
      "description": "Detect deals without next step in active stages",
      "ruleType": "BUSINESS_RULE",
      "entityType": "DEAL",
      "condition": {
        "stage": ["Qualified", "Proposal", "Negotiation"],
        "nextStep": { "operator": "is_null" }
      },
      "action": {
        "type": "SET_FIELD",
        "autoFix": true,
        "recommendation": "Add next step with due date"
      },
      "severity": "HIGH",
      "isActive": true,
      "metrics": {
        "issuesDetected": 28,
        "autoFixed": 19,
        "successRate": 0.68
      }
    }
  ]
}
```

### Create Custom Rule
```http
POST /hygiene/rules
```

**Request Body:**
```json
{
  "name": "High value deals without competitor info",
  "description": "Flag deals over $100k missing competitor information",
  "ruleType": "BUSINESS_RULE",
  "entityType": "DEAL",
  "condition": {
    "and": [
      { "amount": { "operator": "gt", "value": 100000 } },
      { "stage": ["Proposal", "Negotiation"] },
      { "competitor": { "operator": "is_null" } }
    ]
  },
  "action": {
    "type": "SEND_ALERT",
    "severity": "MEDIUM",
    "message": "High value deal missing competitor analysis"
  },
  "isActive": true
}
```

---

## 8. Alerts API

### Get Alerts
```http
GET /alerts
```

**Query Parameters:**
- `type`: Risk, Opportunity, Deadline, System
- `severity`: Low, Medium, High, Critical
- `status`: Active, Acknowledged, Resolved
- `entityType`: Deal, Account, Team

**Response:**
```json
{
  "data": [
    {
      "id": "alert_123456789",
      "type": "RISK",
      "title": "High-value deal at risk of slippage",
      "description": "ACME Corporation deal may slip to next quarter due to decision timeline",
      "severity": "HIGH",
      "entityType": "DEAL",
      "entityId": "deal_123456789",
      "entityName": "ACME Corporation - Enterprise Deal",
      "amount": 250000.00,
      "impact": "Q1 revenue at risk",
      "actions": [
        {
          "type": "CALL_EXECUTIVE",
          "description": "Schedule call with executive champion",
          "priority": "URGENT"
        },
        {
          "type": "UPDATE_FORECAST",
          "description": "Consider moving to Best Case category",
          "priority": "HIGH"
        }
      ],
      "createdAt": "2024-01-25T09:00:00Z",
      "expiresAt": "2024-02-25T09:00:00Z",
      "status": "ACTIVE",
      "assignedTo": {
        "id": "user_123456789",
        "name": "John Smith"
      }
    }
  ],
  "metadata": {
    "total": 15,
    "unread": 8,
    "critical": 2,
    "requiringAction": 12
  }
}
```

### Acknowledge Alert
```http
POST /alerts/{alertId}/acknowledge
```

**Request Body:**
```json
{
  "status": "ACKNOWLEDGED",
  "notes": "Will call executive sponsor today",
  "followUpDate": "2024-01-26"
}
```

### Create Alert
```http
POST /alerts
```

**Request Body:**
```json
{
  "type": "OPPORTUNITY",
  "title": "Cross-sell opportunity identified",
  "description": "Data engineering team could benefit from analytics platform",
  "entityType": "ACCOUNT",
  "entityId": "acc_123456789",
  "severity": "MEDIUM",
  "actions": [
    {
      "type": "OPPORTUNITY",
      "description": "Create cross-sell deal for analytics platform"
    }
  ],
  "assignedTo": "user_123456789"
}
```

---

## 9. WebSocket Real-time API

### Connection & Authentication
```javascript
// Client-side connection
import { io } from 'socket.io-client';

const socket = io('wss://api.revops-platform.com/realtime', {
  auth: {
    token: 'jwt_token',
    customerId: 'customer_123'
  }
});

// Join customer room
socket.emit('join_customer', 'customer_123');
```

### Real-time Events

#### Entity Updates
```javascript
socket.on('entity_update', (data) => {
  console.log('Entity updated:', data);
  // {
  //   entityType: 'DEAL',
  //   entityId: 'deal_123456789',
  //   changes: { stage: 'Negotiation', probability: 90 },
  //   timestamp: '2024-01-25T10:30:00Z'
  // }
});
```

#### Metric Updates
```javascript
socket.on('metric_update', (data) => {
  console.log('Metric updated:', data);
  // {
  //   type: 'PIPELINE_TOTAL',
  //   value: 8750000.00,
  //   dimensions: { owner: 'user_123' },
  //   timestamp: '2024-01-25T10:30:00Z'
  // }
});
```

#### New Alerts
```javascript
socket.on('new_alert', (alert) => {
  console.log('New alert:', alert);
  // Full alert object
});
```

#### Sync Progress
```javascript
socket.on('sync_progress', (data) => {
  console.log('Sync progress:', data);
  // {
  //   integrationId: 'int_123456789',
  //   progress: { percentage: 65.3, processed: 8500, total: 13000 },
  //   status: 'processing'
  // }
});
```

### Subscription Management
```javascript
// Subscribe to specific entity updates
socket.emit('subscribe_entity', {
  entityType: 'DEAL',
  entityId: 'deal_123456789'
});

// Subscribe to metrics updates
socket.emit('subscribe_metrics', {
  types: ['PIPELINE_TOTAL', 'DEAL_COUNT'],
  dimensions: { owner: 'user_123' }
});

// Unsubscribe
socket.emit('unsubscribe', {
  entityType: 'DEAL',
  entityId: 'deal_123456789'
});
```

---

## 10. Error Handling & Response Format

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than 0"
      },
      {
        "field": "closeDate",
        "message": "Close date cannot be in the past"
      }
    ]
  },
  "requestId": "req_123456789",
  "timestamp": "2024-01-25T10:30:00Z"
}
```

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Response Format
All successful responses include:
- `data`: Primary response data
- `pagination`: For list endpoints (page, limit, total, etc.)
- `meta`: Additional metadata
- `links`: Related links when applicable

### Rate Limiting Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1706178000
```

### Request ID
Every request includes a unique ID for tracing:
```http
X-Request-ID: req_123456789
```

---

## 11. SDK Examples

### JavaScript/TypeScript SDK
```typescript
import { RevOpsClient } from '@revops/platform-sdk';

const client = new RevOpsClient({
  apiKey: 'your-api-key',
  customerId: 'customer_123'
});

// Get deals
const deals = await client.deals.list({
  stage: ['Proposal', 'Negotiation'],
  limit: 50
});

// Get account health
const health = await client.accounts.getHealth('acc_123456789');

// Generate report
const report = await client.reports.generate({
  templateId: 'weekly_leadership',
  period: { from: '2024-01-15', to: '2024-01-21' },
  format: 'PDF'
});

// Real-time subscriptions
client.realtime.on('entity_update', (data) => {
  console.log('Entity updated:', data);
});
```

### Python SDK
```python
from revops import RevOpsClient

client = RevOpsClient(
    api_key='your-api-key',
    customer_id='customer_123'
)

# Get pipeline metrics
pipeline = client.metrics.get_pipeline(
    period='MONTHLY',
    date_range={'from': '2024-01-01', 'to': '2024-01-31'}
)

# Generate insights
insights = client.ai_insights.list(
    type='RISK',
    severity=['HIGH', 'CRITICAL']
)

# Create hygiene rule
rule = client.hygiene.create_rule(
    name='High value deals without next step',
    entity_type='DEAL',
    condition={'amount': {'gt': 100000}, 'next_step': {'is_null': True}},
    action={'type': 'SEND_ALERT', 'severity': 'HIGH'}
)
```

This comprehensive API specification provides all endpoints needed for the RevOps Automation Platform, with detailed request/response formats, error handling, and SDK examples for easy integration.
