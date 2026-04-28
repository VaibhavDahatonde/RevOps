# AI Prompt Flows - Summaries, Forecasts, and Reports

## Overview
Comprehensive prompt engineering framework for all AI-powered features in the RevOps platform. Each prompt flow is optimized for specific use cases with structured inputs/outputs, consistent formatting, and reliable performance.

## Prompt Architecture

### Base Prompt Template
```typescript
interface PromptTemplate {
  systemPrompt: string;
  contextBuilder: (data: any) => ContextData;
  userPrompt: string;
  outputSchema: OutputSchema;
  postProcessing: (output: any) => ProcessedOutput;
}

interface ContextData {
  customer: CustomerContext;
  timeframe: TimeframeContext;
  entityType: EntityType;
  specificData: any;
}
```

### System Prompts
```typescript
const BASE_SYSTEM_PROMPT = `You are an expert RevOps AI assistant with 15+ years of experience in revenue operations, sales pipeline management, B2B SaaS metrics, and business intelligence.

Your expertise includes:
- CRM data analysis and interpretation
- Sales forecasting and pipeline health assessment
- Customer success and churn risk analysis
- Marketing attribution and funnel analysis
- Sales team performance optimization
- Executive reporting and board presentations

Key principles:
- Be concise but thorough
- Focus on actionable insights, not just data
- Quantify impact and provide specific recommendations
- Consider multiple stakeholders (sales, marketing, leadership, finance)
- Flag risks and opportunities clearly
- Use clear, professional language suitable for executives

Always structure your responses with clear sections and bullet points when appropriate.`;

const DEAL_ANALYSIS_PROMPT = `You are a senior sales strategist and deal expert who specializes in B2B enterprise software sales. You have helped sales teams close billions in ARR through strategic deal analysis and coaching.

Your core competencies:
- Deal stage progression and cycle time optimization
- Competitive analysis and positioning
- Executive engagement strategies
- Deal risk assessment and mitigation
- Deal sizing and negotiation tactics
- Cross-functional collaboration (product, legal, finance)

Focus on practical, actionable advice that sales reps can implement immediately. Always consider the specific context of the deal, customer, competitive landscape.`;

const FORECASTING_PROMPT = `You are a CFO-level revenue forecasting expert with deep experience in B2B SaaS metrics, revenue recognition, and board-level financial planning. You specialize in converting pipeline data into reliable financial forecasts.

Your expertise includes:
- Pipeline-to-revenue conversion modeling
- Seasonality and trend analysis
- Risk-adjusted forecasting methodologies
- Quartile-based deal stage analysis
- Team performance variance analysis
- Market condition impact assessment

Provide conservative, data-driven forecasts with clear confidence intervals and risk factors. Always back up your projections with specific data points and calculations.`;
```

## 1. Deal Analysis Prompts

### Deal Summary Generation
```typescript
export class DealSummaryPrompt {
  static generate(context: DealContext): string {
    return `Analyze this deal and provide an executive summary:

## Deal Information
- Name: ${context.deal.name}
- Amount: $${context.deal.amount.toLocaleString()} ${context.deal.currency}
- Stage: ${context.deal.stage} (Probability: ${context.deal.probability}%)
- Close Date: ${context.deal.closeDate}
- Days in Stage: ${context.metrics.daysInStage}
- Type: ${context.deal.type}

## Account Context
- Company: ${context.account.name}
- Industry: ${context.account.industry}
- Size: ${context.account.tier}
- ARR: $${context.account.arr?.toLocaleString() || 'N/A'}
- Health Score: ${context.account.healthScore}/100

## Recent Activity (Last 30 days)
${context.activities.map(activity => 
  `- ${activity.type}: ${activity.subject} (${activity.date}, Engagement: ${activity.engagementScore}/10)`
).join('\n')}

## Key Contacts
${context.contacts.map(contact => 
  `- ${contact.name}, ${contact.title} ${contact.isDecisionMaker ? '(Decision Maker)' : ''}`
).join('\n')}

## Competitive Context
${context.competitors ? context.competitors.map(competitor => 
  `- ${competitor.name}: ${competitor.strength} presence, ${competitor.relationship}`
).join('\n') : 'No known competitors'}

## Similar Deals Performance
${context.similarDeals.map(deal => 
  `- ${deal.name}: $${deal.amount.toLocaleString()}, ${deal.stage} (${deal.salesCycleDays} days cycle)`
).join('\n')}

## Risk Factors Detected
${context.riskFactors.map(risk => 
  `- ${risk.type}: ${risk.description} (Impact: ${risk.impact})`
).join('\n')}

Provide an executive summary covering:
1. **Deal Overview**: Current status and key dynamics
2. **Strengths**: Why this deal is likely to close
3. **Risks**: Primary obstacles and concerns
4. **Critical Path**: Key next steps and timeline
5. **Win Probability**: Your assessment (0-100%) with reasoning
6. **Strategic Recommendations**: 3-5 specific actions to accelerate/close

Format your response for a busy executive watching dozens of deals.`;
  }
}
```

### Deal Risk Analysis
```typescript
export class DealRiskPrompt {
  static generate(context: DealContext): string {
    return `Conduct a comprehensive risk assessment for this deal:

## Deal Details
${JSON.stringify(context.deal, null, 2)}

## Activity Pattern Analysis
${this.analyzeActivityPattern(context.activities)}

## Communication Health
${this.analyzeCommunication(context.activities)}

## Sales Cycle Anomalies
${this.analyzeSalesCycle(context.deal, context.similarDeals)}

### Instructions:
1. Identify ALL potential risks (not just obvious ones)
2. Assess severity (LOW/MEDIUM/HIGH/CRITICAL)
3. Provide specific mitigation strategies for each risk
4. Prioritize risks by impact and likelihood
5. Suggest monitoring indicators for each risk

### Risk Categories to Consider:
- **Timing Risks**: Deal slippage, decision delays, budget cycles
- **Competitive Risks**: Competitor positioning, incumbents, procurement
- **Relationship Risks**: Key person dependencies, sponsorship changes
- **Product Risks**: Fit concerns, implementation complexity, technical gaps
- **Commercial Risks**: Budget constraints, pricing objections, procurement hurdles
- **Execution Risks**: Internal resources, legal delays, customer readiness

Output format:
{
  "riskAssessment": {
    "overallRiskScore": "0-100",
    "highImpactRisks": [
      {
        "type": "risk_category",
        "description": "Specific risk description",
        "severity": "HIGH|MEDIUM|LOW",
        "probability": "0.8",
        "impact": "explain business impact",
        "indicators": ["specific warning signs"],
        "mitigation": ["actionable steps"],
        "owner": "who should monitor"
      }
    ],
    "monitoringPlan": {
      "keyIndicators": ["signals to watch"],
      "checkpoints": ["review dates/milestones"],
      "escalationTriggers": ["when to alert leadership"]
    }
  }
}`;
  }
}
```

## 2. Forecasting Prompts

### Weekly Pipeline Forecast
```typescript
export class WeeklyForecastPrompt {
  static generate(context: ForecastContext): string {
    return `Generate a reliable revenue forecast analysis:

## Current Pipeline Status
${this.formatPipeline(context.pipeline.byStage)}

## Team Performance Analysis
${this.formatTeamPerformance(context.teamMetrics)}

## Historical Performance
${this.formatHistorical(context.historicalData)}

## Market Conditions
${context.marketConditions}

### Forecast Requirements:
1. **Commit Forecast** (>=80% confidence): What you would bet your job on
2. **Best Case Forecast** (>=60% confidence): If things go well
3. **Pipeline Coverage Analysis**: Current pipeline vs quarterly quota
4. **Risk Factors**: Potential deal slippage and concentration risks
5. **Key Assumptions**: What conditions support your forecast

### Analysis Framework:
- Examine each deal's probability and timeline
- Consider sales team performance variance
- Factor in seasonality trends
- Account for competitive pressures
- Include market condition impacts

### Output Format:
{
  "forecast": {
    "period": "${context.currentPeriod}",
    "quota": ${context.quota},
    "commit": {
      "amount": 0,
      "dealCount": 0,
      "confidence": 0,
      "confidenceInterval": {
        "low": 0,
        "high": 0
      }
    },
    "bestCase": {
      "amount": 0,
      "dealCount": 0,
      "confidence": 0
    },
    "pipeline": {
      "totalAmount": 0,
      "totalDeals": 0,
      "coverageRatio": 0,
      "debt": 0
    }
  },
  "riskAnalysis": {
    "concentrationRisk": {
      "hasRisk": false,
      "description": "",
      "topDeals": []
    },
    "timelineRisk": {
      "hasRisk": false,
      "description": ""
    },
    "pipelineVelocity": {
      "current": 0,
      "target": 0,
      "trend": "increasing|decreasing|stable"
    }
  },
  "insights": [
    {
      "type": "OPPORTUNITY|RISK",
      "description": "",
      "impact": "",
      "action": ""
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "action": "",
      "owner": "",
      "timeline": ""
    }
  ]
}

Be conservative but accurate. Leadership needs reliable numbers they can actually plan around.`;
  }

  private static formatPipeline(stages: any[]): string {
    if (!stages || stages.length === 0) return 'No pipeline data available';
    
    return stages.map((stage, index) => {
      const percentage = stage.percentage || 0;
      return `Stage ${index + 1}: ${stage.stage || 'N/A'} - $${(stage.amount || 0).toLocaleString()} (${stage.dealCount || 0} deals, ${percentage.toFixed(1)}% of pipeline)`;
    }).join('\n');
  }
}
```

### Monthly Board Report
```typescript
export class BoardReportPrompt {
  static generate(context: BoardReportContext): string {
    return `Generate a comprehensive monthly board report:

## Executive Summary Requirements
Create a professional board-level report that addresses:
1. Revenue performance vs target
2. Key business health indicators
3. Strategic challenges and opportunities
4. Forward-looking outlook with confidence

## Data Provided

### Revenue Performance
${JSON.stringify(context.revenueMetrics, null, 2)}

### Customer Metrics
${JSON.stringify(context.customerMetrics, null, 2)}

### Product/Usage Metrics
${JSON.stringify(context.productMetrics, null, 2)}

### Team Performance
${JSON.stringify(context.teamPerformance, null, 2)}

### Market Context
${context.marketConditions}

### Key Events
${context.keyEvents}

### Previous Board Actions
${context.previousBoardActions}

## Report Structure:
{
  "executiveSummary": {
    "headline": "One sentence capture of the month",
    "highlights": ["3 key achievements"],
    "challenges": ["2-3 main concerns"],
    "outlook": "forward-looking statement"
  },
  "financialHighlights": {
    "revenue": {
      "actual": 0,
      "target": 0,
      "variance": 0,
      "variancePercent": 0,
      "yoyGrowth": 0
    },
    "newARR": {
      "actual": 0,
      "target": 0,
      "breakdown": {
        "newBusiness": 0,
        "expansion": 0,
        "churn": -0
      }
    },
    "grossMargin": 0,
    "cashPosition": 0
  },
  "keyMetrics": {
    "newCustomers": 0,
    "expansionRevenue": 0,
    "churnRate": 0,
    "netRetention": 0,
    "salesCycleDays": 0,
    "winRate": 0,
    "arrPerCustomer": 0
  },
  "businessHealth": {
    "pipelineHealth": {
      "coverage": 0,
      "quality": "excellent|good|concerning",
      "concentration": "diversified|risky"
    },
    "productVelocity": {
      "featureAdoption": 0,
      "usageGrowth": 0,
      "satisfaction": 0
    },
    "teamProductivity": {
      "quotaAttainment": 0,
      "hiringPlanTrack": "on_track|delayed|ahead",
      "morale": "high|medium|concerning"
    }
  },
  "criticalIssues": [
    {
      "issue": "clear problem statement",
      "impact": "business impact",
      "owner": "who owns resolving",
      "timeline": "when will be resolved",
      "boardActionNeeded": true|false
    }
  ],
  "strategicHighlight": {
    "accomplishment": "major achievement",
    "strategicImportance": "why it matters",
    "nextMilestone": "what's next"
  },
  "outlook": {
    "nextQuarterForecast": {
      "low": 0,
      "target": 0,
      "high": 0
    },
    "topPriorities": ["strategic priorities"],
    "keyRisks": ["potential blockers"],
    "resourceNeeds": ["any board support needed"]
  },
  "boardRecommendations": [
    {
      "action": "specific ask of board",
      "rationale": "why it's important",
      "urgency": "immediate|near-term|strategic"
    }
  ]
}

Tone should be professional, transparent, and forward-looking. Include both positive achievements and honest challenges. Format for busy board members who need clear insights quickly.`;
  }
}
```

## 3. Customer Success & Churn Analysis

### Churn Risk Assessment
```typescript
export class ChurnRiskPrompt {
  static generate(context: CustomerContext): string {
    return `Analyze this customer's churn risk and provide retention strategy:

## Customer Profile
- Company: ${context.account.name}
- ARR: $${context.account.arr?.toLocaleString() || 'N/A'}
- Tier: ${context.account.tier}
- Health Score: ${context.account.healthScore}/100
- Lifecycle Stage: ${context.account.lifecycleStage}
- Customer Since: ${context.contract.startDate}

## Usage & Engagement Data
${this.formatUsageData(context.usageMetrics)}

## Support Activity
${this.formatSupportData(context.supportTickets)}

## Product Adoption
${this.formatAdoptionData(context.adoptionMetrics)}

## Communication History
${this.formatCommunication(context.communications)}

## Competitive Intelligence
${context.competitors ? this.formatCompetitors(context.competitors) : 'No competitor activity detected'}

## Team & Account Changes
${this.formatAccountChanges(context.accountChanges)}

## Risk Analysis Requirements:
{
  "churnRisk": {
    "overallScore": 0, // 0-100
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
    "timeframe": "likely churn timeframe",
    "confidence": 0 // confidence in assessment
  },
  "riskFactors": [
    {
      "category": "USAGE|COMMERCIAL|RELATIONSHIP|PRODUCT",
      "factor": "specific risk factor",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "how this manifests",
      "earlyIndicators": ["warning signs to watch"]
    }
  ],
  "strengths": [
    {
      "factor": "retention strength",
      "description": "why customer should stay",
      "value": "$$impact to customer"
    }
  ],
  "retentionStrategy": {
    "immediateActions": [
      {
        "action": "specific action",
        "owner": "who should execute",
        "timeline": "when to complete",
        "expectedImpact": "how this helps"
      }
    ],
    "relationshipBuilding": [
      {
        "activity": "relationship activity",
        "target": "who to engage",
        "frequency": "how often",
        "objective": "what to achieve"
      }
    ],
    "valueDemonstration": [
      {
        "valueProp": "specific value to highlight",
        "evidence": "supporting data",
        "delivery": "how to communicate"
      }
    ]
  },
  "earlyWarningSystem": {
    "keyMetrics": ["metrics to monitor"],
    "alertThresholds": ["warning levels"],
    "monitoringFrequency": "how often to check",
    "responsibleOwner": "who watches"
  }
}

Focus on actionable retention strategies that Customer Success can implement immediately. Provide specific tactics, not just general advice.`;
  }
}
```

## 4. Sales Team Performance Analysis

### Rep Performance Review
```typescript
export class RepPerformancePrompt {
  static generate(context: RepContext): string {
    return `Generate a comprehensive performance review and coaching plan:

## Performance Data
- Rep: ${context.rep.name}
- Role: ${context.rep.role}
- Tenure: ${context.rep.tenure}
- Current Quota: $${context.quota.current.toLocaleString()}/quarter
- Attainment: ${context.metrics.quotaAttainment}%

### Key Metrics
${this.formatMetrics(context.metrics)}

### Deal Analysis
${this.formatDealAnalysis(context.deals)}

### Activity Patterns
${this.formatActivityData(context.activities)}

### Pipeline Health
${this.formatPipelineHealth(context.pipeline)}

## Coaching Analysis Needed:
{
  "performanceSummary": {
    "overallRating": "exceeds|meets|below|significantly_below",
    "keyStrengths": ["proven strengths"],
    "developmentAreas": ["areas needing improvement"],
    "performanceTrend": "improving|stable|declining"
  },
  "quantitativeAnalysis": {
    "dealing": {
      "skills": ["specific deal execution skills"],
      "performance": "assessment of deal quality"
    },
    "pipeline": {
      "quality": "strong|adequate|concerning",
      "velocity": "fast|normal|slow",
      "coverage": "excellent|sufficient|insufficient"
    },
    "conversion": {
      "strengths": ["conversion strengths"],
      "weakness": ["conversion gaps"]
    }
  },
  "behavioralInsights": {
    "workHabits": ["observable patterns"],
    "skills": ["skill assessment"],
    "challenges": ["development needs"]
  },
  "coachingPlan": {
    "immediateFocus": {
      "skill": "primary development area",
      "action": "specific coaching action",
      "timeline": "when to focus",
      "resources": "what's needed"
    },
    "30DayGoals": [
      {
        "goal": "specific measurable goal",
        "kpi": "how success measured",
        "activities": "actions to achieve"
      }
    ],
    "90DayGoals": [
      {
        "goal": "longer-term development goal",
        "masteryIndicators": ["signs of improvement"],
        "supportNeeded": "resources/time investment"
      }
    ],
    "ongoingDevelopment": {
      "skillRotation": ["skills to cycle through"],
      "learningResources": ["training/references"],
      "mentorship": "pairing opportunities"
    }
  },
  "managerActions": {
    "immediate": ["actions for this week"],
    "ongoing": ["regular management activities"],
    "support": ["how to help succeed"],
    "recognition": ["positive reinforcement opportunities"]
  }
}

Focus on specific, actionable coaching that directly impacts revenue performance. Provide concrete examples and measurable goals.`;
  }
}
```

## 5. Market & Competitive Intelligence

### Competitive Analysis
```typescript
export class CompetitiveIntelligencePrompt {
  static generate(context: CompetitiveContext): string {
    return `Analyze competitive threats and develop counter-strategy:

## Market Intelligence
${JSON.stringify(context.marketData, null, 2)}

## Competitive Landscape
${this.formatCompetitors(context.competitors)}

## Recent Deal Intelligence
${this.formatRecentDeals(context.recentDeals)}

## Win/Loss Analysis
${this.formatWinLossAnalysis(context.winLossData)}

## Customer Feedback
${this.formatCustomerFeedback(context.customerFeedback)}

## Strategic Analysis Required:
{
  "marketPosition": {
    "currentPositioning": "how we're perceived",
    "strengths": ["differentiating factors"],
    "weaknesses": ["vulnerability areas"],
    "opportunities": ["market opportunities"]
  },
  "competitiveThreats": [
    {
      "competitor": "competitor name",
      "threatLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "threatType": "PRODUCT|PRICING|FEATURES|RELATIONSHIP",
      "specificThreat": "detailed threat description",
      "targetSegments": ["segments at risk"],
      "impactAssessment": "business impact magnitude",
      "urgency": "IMMEDIATE|NEAR-TERM|STRATEGIC"
    }
  ],
  "counterStrategies": [
    {
      "threat": "threat being addressed",
      "strategy": "counter-strategy approach",
      "tactics": ["specific executable tactics"],
      "owner": "who should lead",
      "timeline": "when to execute",
      "successMetrics": ["how to measure success"],
      "resources": ["what's needed to execute"]
    }
  ],
  "differentiationLeverage": {
    "currentAdvantages": ["sustainable advantages"],
    "newDifferentiators": ["opportunities to stand out"],
    "competitiveWeaknesses": ["competitor vulnerabilities"],
    "positioningMessages": ["recommended messaging"]
  },
  "salesEnablement": {
    "battleCards": ["needed content/tools"],
    "training": "sales team readiness needs",
    "objections": ["common competitor objections"],
    "rebuttals": ["effective counter-arguments"],
    "caseStudies": ["needed competitive wins"]
  },
  "strategicRecommendations": [
    {
      "priority": "STRATEGIC|TACTICAL|IMMEDIATE",
      "action": "specific strategic action",
      "rationale": "why it's important",
      "impact": "expected business impact",
      "investment": "resource/cost requirement"
    }
  ]
}

Provide actionable intelligence that sales, marketing, and product teams can implement immediately. Focus on practical counter-competitive strategies.`;
  }
}
```

## 6. Real-time Alert Generation

### Deal Alert Prompts
```typescript
export class AlertGenerationPrompt {
  static generateDealAlert(context: DealAlertContext): string {
    return `Generate a high-quality alert for this deal situation:

## Deal Alert Context
- Alert Type: ${context.alertType}
- Severity: ${context.severity}
- Deal: ${context.deal.name} ($${context.deal.amount.toLocaleString()})
- Current State: ${context.deal.stage}, ${context.deal.probability}% probability

## Trigger Event
${context.triggerEvent}

## Deal Health Metrics
${this.formatDealHealth(context.metrics)}

## Activity Timeline
${this.formatActivityTimeline(context.recentActivities)}

## Historical Context
${this.formatHistoricalContext(context.historicalData)}

## Alert Generation Requirements:
{
  "alert": {
    "title": "concise, actionable title",
    "description": "clear explanation of situation",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "urgency": "time sensitivity",
    "impact": {
      "type": "REVENUE|TIMELINE|RELATIONSHIP|PROCESS",
      "magnitude": "quantified impact",
      "scope": "who is affected"
    }
  },
  "context": {
    "situation": "what happened",
    "currentStatus": "deal current state",
    "factors": ["contributing factors"],
    "timeline": "relevant time context"
  },
  "analysis": {
    "rootCause": "underlying issue",
    "patterns": "repeating patterns to watch",
    "implications": "potential downstream effects",
    "probabilityEstimate": "likelihood of negative outcome"
  },
  "recommendations": [
    {
      "action": "specific recommended action",
      "priority": "IMMEDIATE|HIGH|MEDIUM|LOW",
      "owner": "who should execute",
      "timeline": "when to complete",
      "successCriteria": "what success looks like"
    }
  ],
  "nextSteps": {
    "immediate": ["what to do right now"],
    "monitoring": ["what to watch for"],
    "escalation": ["when to escalate to leadership"]
  },
  "prevention": {
    "processChanges": ["future process improvements"],
    "monitoring": "ongoing monitoring recommendations",
    "training": "team capability improvements"
  }
}

The alert should be immediately actionable for the deal owner, with clear next steps and escalation paths. Focus on preventing revenue loss or deal slippage.`;
  }
}
```

## 7. Prompt Optimization & Quality Control

### Prompt Performance Monitoring
```typescript
export class PromptQualityMonitor {
  static async evaluatePromptPerformance(
    promptType: string,
    input: any,
    output: any,
    userFeedback?: UserFeedback
  ): Promise<QualityMetrics> {
    const metrics = {
      promptType,
      timestamp: new Date(),
      inputTokens: this.countTokens(input),
      outputTokens: this.countTokens(output),
      responseTime: userFeedback?.responseTime || 0,
      relevance: userFeedback?.relevanceScore || 0,
      clarity: userFeedback?.clarityScore || 0,
      actionability: userFeedback?.actionabilityScore || 0,
      completeness: userFeedback?.completenessScore || 0,
      errors: this.detectErrors(output),
      adherenceToSchema: this.validateSchema(output),
    };
    
    // Store for analysis
    await this.logQualityMetrics(metrics);
    
    // Trigger prompt optimization if needed
    if (this.needsOptimization(metrics)) {
      await this.optimizePrompt(promptType);
    }
    
    return metrics;
  }
  
  private static needsOptimization(metrics: QualityMetrics): boolean {
    const qualityThreshold = 0.8;
    const avgScore = (metrics.relevance + metrics.clarity + 
                     metrics.actionability + metrics.completeness) / 4;
    
    return avgScore < qualityThreshold || 
           metrics.errors.length > 0 ||
           !metrics.adherenceToSchema;
  }
}
```

### Prompt Versioning & A/B Testing
```typescript
export class PromptExperimentManager {
  static async runA/BTest(
    promptType: string,
    variants: PromptVariant[],
    testSize: number = 100
  ): Promise<TestResults> {
    const results: TestResults = {
      promptType,
      variants: [],
      winner: null,
      statisticalSignificance: false,
    };
    
    for (const variant of variants) {
      const variantResults = await this.testVariant(promptType, variant, testSize);
      results.variants.push(variantResults);
    }
    
    // Calculate statistical significance
    results.winner = this.selectWinner(results.variants);
    results.statisticalSignificance = this.calculateSignificance(results.variants);
    
    return results;
  }
  
  private static testVariant(
    promptType: string, 
    variant: PromptVariant, 
    sampleSize: number
  ): Promise<VariantResults> {
    // Implementation for A/B testing logic
  }
}
```

## 8. Prompt Execution Framework

### Prompt Executor Service
```typescript
export class PromptExecutor {
  static async executePrompt<T>(
    promptType: string,
    context: any,
    options: PromptOptions = {}
  ): Promise<T> {
    try {
      // 1. Select and load prompt template
      const template = await PromptRegistry.get(promptType);
      
      // 2. Build context
      const enrichedContext = await this.buildContext(context, promptType);
      
      // 3. Generate prompt
      const prompt = await this.generatePrompt(template, enrichedContext);
      
      // 4. Execute with LLM
      const response = await this.executeWithLLM(prompt, options);
      
      // 5. Parse and validate response
      const parsed = await this.parseResponse(response, template.outputSchema);
      
      // 6. Post-process
      const result = await template.postProcessing(parsed);
      
      // 7. Log for quality monitoring
      await this.logExecution(promptType, enrichedContext, result);
      
      return result;
    } catch (error) {
      await this.logError(promptType, error);
      throw new PromptExecutionError(`Failed to execute ${promptType}`, error);
    }
  }
  
  private static async buildContext(context: any, promptType: string): Promise<ContextData> {
    // Enrich context with additional data as needed
    return {
      customer: await this.customerContext(context.customerId),
      timeframe: this.timeframeContext(context.dateRange),
      entityType: this.extractEntityType(context),
      specificData: context,
    };
  }
  
  private static async executeWithLLM(
    prompt: string, 
    options: PromptOptions
  ): Promise<LLMResponse> {
    return await claudeAPI.generate({
      prompt,
      model: options.model || 'claude-3-sonnet-20241022',
      maxTokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.1,
      systemPrompt: options.systemPrompt,
    });
  }
}
```

### Prompt Registry & Templates
```typescript
export class PromptRegistry {
  private static templates = new Map<string, PromptTemplate>();
  
  static register(promptType: string, template: PromptTemplate): void {
    this.templates.set(promptType, template);
  }
  
  static async get(promptType: string): Promise<PromptTemplate> {
    const template = this.templates.get(promptType);
    if (!template) {
      throw new Error(`No template found for prompt type: ${promptType}`);
    }
    
    // Return deep copy to prevent mutation
    return JSON.parse(JSON.stringify(template));
  }
}

// Register all prompt templates
PromptRegistry.register('DEAL_SUMMARY', {
  systemPrompt: DEAL_ANALYSIS_PROMPT,
  contextBuilder: DealSummaryPrompt.generate,
  userPrompt: '',
  outputSchema: DEAL_SUMMARY_SCHEMA,
  postProcessing: (output) => output,
});
```

## 9. Error Handling & Fallbacks

### Prompt Fallback Strategies
```typescript
export class PromptFallbackHandler {
  static async handleExecutionError(
    promptType: string,
    error: Error,
    context: any
  ): Promise<any> {
    // Strategy 1: Try simpler version
    try {
      const simplifiedPrompt = await this.getSimplifiedPrompt(promptType);
      return await PromptExecutor.execute(simplifiedPrompt, context);
    } catch (e) {
      // Strategy 2: Use cached similar result
      const cached = await this.getCachedSimilar(promptType, context);
      if (cached) {
        return cached;
      }
      
      // Strategy 3: Graceful degradation
      return await this.generateBasicResponse(promptType, context);
    }
  }
  
  private static async generateBasicResponse(promptType: string, context: any): Promise<any> {
    switch (promptType) {
      case 'DEAL_SUMMARY':
        return this.generateBasicDealSummary(context);
      case 'WEEKLY_FORECAST':
        return this.generateBasicForecast(context);
      default:
        return { error: 'Unable to generate insights', fallback: 'basic' };
    }
  }
}
```

This comprehensive prompt flow system ensures consistent, high-quality AI outputs across all RevOps platform features while maintaining performance, reliability, and continuous improvement through monitoring and optimization.
