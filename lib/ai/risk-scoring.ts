import type { Opportunity, ActivityData, CallAnalysis } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

export interface RiskFactors {
  stagnation: number // 0-100
  lowActivity: number // 0-100
  agingDeal: number // 0-100
  missingData: number // 0-100
  competitiveLoss: number // 0-100
  poorEngagement: number // 0-100
}

export interface RiskScore {
  overall: number // 0-100
  factors: RiskFactors
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  insights: string[]
  recommendations: string[]
}

export class RiskScoringEngine {
  // Calculate comprehensive risk score for an opportunity
  static async calculateRiskScore(opportunity: Opportunity): Promise<RiskScore> {
    try {
      const factors = await this.calculateRiskFactors(opportunity)
      const overall = this.calculateOverallScore(factors)
      const level = this.determineRiskLevel(overall)
      const insights = this.generateInsights(factors, opportunity)
      const recommendations = this.generateRecommendations(factors, opportunity)

      return {
        overall,
        factors,
        level,
        insights,
        recommendations
      }
    } catch (error) {
      console.error('Risk scoring calculation failed:', error)
      return this.getDefaultRiskScore()
    }
  }

  // Calculate individual risk factors
  private static async calculateRiskFactors(opportunity: Opportunity): Promise<RiskFactors> {
    const activityScore = await this.calculateActivityRisk(opportunity)
    const stagnationScore = await this.calculateStagnationRisk(opportunity)
    const ageScore = await this.calculateAgeRisk(opportunity)
    const dataScore = await this.calculateDataCompleteness(opportunity)
    const competitionScore = await this.calculateCompetitionRisk(opportunity)
    const engagementScore = await this.calculateEngagementRisk(opportunity)

    return {
      stagnation: stagnationScore,
      lowActivity: activityScore,
      agingDeal: ageScore,
      missingData: dataScore,
      competitiveLoss: competitionScore,
      poorEngagement: engagementScore
    }
  }

  // Calculate activity-based risk
  private static async calculateActivityRisk(opportunity: Opportunity): Promise<number> {
    const supabase = createClient()
    
    try {
      // Get recent activities for this deal
      const { data: activities, error } = await supabase
        .from('canonical_events')
        .select('*')
        .eq('deal_id', opportunity.id)
        .order('timestamp', { ascending: false })
        .limit(10)

      if (error || !activities) {
        console.warn('Failed to fetch activities for risk scoring')
        return 50 // Medium risk if we can't determine
      }

      if (activities.length === 0) {
        return 90 // Critical - no activities
      }

      // Check recency of activities
      const now = new Date()
      const recentActivities = activities.filter(activity => {
        const activityDate = new Date(activity.timestamp)
        const daysDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysDiff <= 7
      })

      if (recentActivities.length === 0) {
        return 80 // High risk - no recent activity
      } else if (recentActivities.length >= 3) {
        return 10 // Low risk - good activity
      } else {
        return 40 // Medium risk - some activity
      }
    } catch (error) {
      console.error('Activity risk calculation error:', error)
      return 50
    }
  }

  // Calculate stagnation risk based on days in stage
  private static calculateStagnationRisk(opportunity: Opportunity): Promise<number> {
    return new Promise((resolve) => {
      const daysSinceUpdate = opportunity.days_since_update || 0
      
      if (daysSinceUpdate >= 30) {
        resolve(90) // Critical stagnation
      } else if (daysSinceUpdate >= 14) {
        resolve(70) // High stagnation
      } else if (daysSinceUpdate >= 7) {
        resolve(40) // Medium stagnation
      } else {
        resolve(10) // Low stagnation
      }
    })
  }

  // Calculate age risk based on deal age
  private static calculateAgeRisk(opportunity: Opportunity): Promise<number> {
    return new Promise((resolve) => {
      const createdDate = new Date(opportunity.created_at)
      const now = new Date()
      const daysInPipeline = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysInPipeline >= 90) {
        resolve(80) // High age risk
      } else if (daysInPipeline >= 60) {
        resolve(60) // Medium age risk
      } else if (daysInPipeline >= 30) {
        resolve(30) // Low-medium age risk
      } else {
        resolve(10) // Low age risk
      }
    })
  }

  // Calculate data completeness risk
  private static calculateDataCompleteness(opportunity: Opportunity): number {
    let missingFields = 0
    let totalFields = 0

    // Required fields to check
    const requiredFields = [
      { field: opportunity.name, name: 'name' },
      { field: opportunity.amount, name: 'amount' },
      { field: opportunity.stage, name: 'stage' },
      { field: opportunity.owner_name, name: 'owner_name' },
      { field: opportunity.account_name, name: 'account_name' },
      { field: opportunity.close_date, name: 'close_date' }
    ]

    requiredFields.forEach(({ field, name }) => {
      totalFields++
      if (!field || field === 'N/A' || (typeof field === 'string' && field.trim() === '')) {
        missingFields++
      }
    })

    // Calculate missing data percentage
    const missingPercentage = (missingFields / totalFields) * 100
    return missingPercentage
  }

  // Calculate competition risk (simplified for now)
  private static calculateCompetitionRisk(opportunity: Opportunity): number {
    // In a real implementation, this would analyze notes, activities, and other data
    // for competitor mentions and competitive situations
    return 25 // Default medium competition risk
  }

  // Calculate engagement risk
  private static async calculateEngagementRisk(opportunity: Opportunity): Promise<number> {
    try {
      // This would analyze email opens, clicks, replies, call participation, etc.
      // For now, we'll use a simplified approach based on probability
      const probability = opportunity.probability || 50
      
      if (probability >= 75) {
        return 15 // Low engagement risk
      } else if (probability >= 50) {
        return 35 // Medium engage risk
      } else if (probability >= 25) {
        return 65 // High engagement risk
      } else {
        return 85 // Critical engagement risk
      }
    } catch (error) {
      console.error('Engagement risk calculation error:', error)
      return 50
    }
  }

  // Calculate overall risk score with weighted factors
  private static calculateOverallScore(factors: RiskFactors): number {
    const weights = {
      stagnation: 0.25,
      lowActivity: 0.20,
      agingDeal: 0.15,
      missingData: 0.15,
      competitiveLoss: 0.15,
      poorEngagement: 0.10
    }

    const weightedScore = 
      factors.stagnation * weights.stagnation +
      factors.lowActivity * weights.lowActivity +
      factors.agingDeal * weights.agingDeal +
      factors.missingData * weights.missingData +
      factors.competitiveLoss * weights.competitiveLoss +
      factors.poorEngagement * weights.poorEngagement

    return Math.round(weightedScore)
  }

  // Determine risk level based on score
  private static determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'CRITICAL'
    if (score >= 60) return 'HIGH'
    if (score >= 40) return 'MEDIUM'
    return 'LOW'
  }

  // Generate actionable insights
  private static generateInsights(factors: RiskFactors, opportunity: Opportunity): string[] {
    const insights: string[] = []

    if (factors.stagnation >= 70) {
      insights.push('Deal has been stagnant for too long - immediate attention needed')
    }
    
    if (factors.lowActivity >= 70) {
      insights.push('No recent activities detected - customer engagement is low')
    }
    
    if (factors.agingDeal >= 60) {
      insights.push('Deal is aging in pipeline without progress')
    }
    
    if (factors.missingData >= 40) {
      insights.push('Critical deal information is missing or incomplete')
    }
    
    if (factors.poorEngagement >= 60) {
      insights.push('Low engagement signals detected from probability and activities')
    }
    
    if (factors.competitiveLoss >= 50) {
      insights.push('Competitor detected - risk of competitive loss')
    }

    return insights
  }

  // Generate actionable recommendations
  private static generateRecommendations(factors: RiskFactors, opportunity: Opportunity): string[] {
    const recommendations: string[] = []

    if (factors.stagnation >= 70) {
      recommendations.push('Schedule immediate discovery call to re-qualify opportunity')
    }
    
    if (factors.lowActivity >= 60) {
      recommendations.push('Create multi-touch engagement plan with at least 3 activities this week')
    }
    
    if (factors.agingDeal >= 60) {
      recommendations.push('Review pipeline stage and consider moving to next step or closing lost')
    }
    
    if (factors.missingData >= 40) {
      recommendations.push('Update missing deal information: close date, amount, decision makers')
    }
    
    if (factors.poorEngagement >= 50) {
      recommendations.push('Increase contact frequency and add value in each interaction')
    }
    
    if (factors.competitiveLoss >= 50) {
      recommendations.push('Differentiate solution and address competitive concerns')
    }

    // Always add proactive recommendations
    if (recommendations.length === 0) {
      recommendations.push('Maintain momentum with regular check-ins')
      recommendations.push('Continue building stakeholder relationships')
    }

    return recommendations
  }

  // Get default risk score for fallback
  private static getDefaultRiskScore(): RiskScore {
    return {
      overall: 50,
      factors: {
        stagnation: 50,
        lowActivity: 50,
        agingDeal: 50,
        missingData: 50,
        competitiveLoss: 25,
        poorEngagement: 50
      },
      level: 'MEDIUM',
      insights: ['Unable to calculate detailed risk analysis'],
      recommendations: ['Review deal manually for risk factors']
    }
  }

  // Batch risk scoring for multiple opportunities
  static async calculateBatchRiskScores(opportunities: Opportunity[]): Promise<RiskScore[]> {
    try {
      const riskScores = await Promise.allSettled(
        opportunities.map(opp => this.calculateRiskScore(opp))
      )

      return riskScores.map(result => 
        result.status === 'fulfilled' ? result.value : this.getDefaultRiskScore()
      )
    } catch (error) {
      console.error('Batch risk scoring failed:', error)
      return opportunities.map(() => this.getDefaultRiskScore())
    }
  }
}

// AI-enhanced risk scoring (would use Claude/Gemini in production)
export class AIEnhancedRiskScoring {
  // Get AI-generated insights for risk factors
  static async getAIInsights(opportunity: Opportunity, context: {
    recentActivities: any[]
    accountHistory: any[]
    competitorAnalysis?: any
  }): Promise<{
    aiAnalysis: string
    suggestedActions: string[]
    confidenceScore: number
  }> {
    try {
      // This would use AI models to analyze patterns and generate insights
      // For now, return mock AI analysis
      return {
        aiAnalysis: `Based on deal ${opportunity.name}, the primary risk factors indicate ${opportunity.stage || 'unknown'} stage challenges with limited recent engagement. Consider increasing touch frequency and value demonstration.`,
        suggestedActions: [
          'Schedule value-focused discovery call within 48 hours',
          'Send personalized case study relevant to account',
          'Schedule executive briefing if deal value > $50k',
          'Identify and engage additional decision makers'
        ],
        confidenceScore: 0.82
      }
    } catch (error) {
      console.error('AI insights generation failed:', error)
      return {
        aiAnalysis: 'AI analysis temporarily unavailable - using rule-based assessment',
        suggestedActions: ['Standard risk mitigation procedures apply'],
        confidenceScore: 0.5
      }
    }
  }

  // Predict win probability based on similar deals
  static async predictWinProbability(opportunity: Opportunity, historicalDeals: Opportunity[]): Promise<{
    probability: number
    confidence: number
    similarDeals: Opportunity[]
    keyFactors: string[]
  }> {
    try {
      // Find similar deals based on amount, stage, industry, etc.
      const similarDeals = this.findSimilarDeals(opportunity, historicalDeals)
      const wonDeals = similarDeals.filter(deal => deal.stage === 'Closed Won')
      const probability = similarDeals.length > 0 ? (wonDeals.length / similarDeals.length) * 100 : 50

      // Determine key factors influencing the prediction
      const keyFactors = this.analyzeKeyFactors(opportunity, similarDeals)

      return {
        probability: Math.round(probability),
        confidence: Math.min(95, similarDeals.length * 10),
        similarDeals: similarDeals.slice(0, 5), // Return top 5 similar deals
        keyFactors
      }
    } catch (error) {
      console.error('Win probability prediction failed:', error)
      return {
        probability: 50,
        confidence: 25,
        similarDeals: [],
        keyFactors: ['Insufficient data for AI prediction']
      }
    }
  }

  // Find similar deals based on multiple criteria
  private static findSimilarDeals(opportunity: Opportunity, historicalDeals: Opportunity[]): Opportunity[] {
    return historicalDeals.filter(deal => {
      // Similar amount range (±50%)
      const amountSimilar = Math.abs(deal.amount - opportunity.amount) / opportunity.amount < 0.5
      
      // Similar stage or closed
      const stageSimilar = deal.stage === opportunity.stage || 
                         ['Closed Won', 'Closed Lost'].includes(deal.stage || '')
      
      return amountSimilar && stageSimilar
    })
  }

  // Analyze key factors influencing deal outcome
  private static analyzeKeyFactors(opportunity: Opportunity, similarDeals: Opportunity[]): string[] {
    const factors: string[] = []
    
    // Analyze velocity patterns
    const avgVelocity = similarDeals.reduce((sum, deal) => {
      const created = new Date(deal.created_at)
      const closed = deal.stage === 'Closed Won' ? new Date() : created
      return sum + (closed.getTime() - created.getTime())
    }, 0) / similarDeals.length / (1000 * 60 * 60 * 24)
    
    if (avgVelocity > 60) {
      factors.push('Extended sales cycle typical for this deal type')
    } else if (avgVelocity < 30) {
      factors.push('Short sales cycle suggests urgency')
    }
    
    // Analyze win rate by stage
    const stageWins = similarDeals.filter(deal => deal.stage === 'Closed Won').length
    const winRate = similarDeals.length > 0 ? (stageWins / similarDeals.length) * 100 : 0
    
    if (winRate > 70) {
      factors.push('Historical high win rate in this stage')
    } else if (winRate < 30) {
      factors.push('Historical low win rate requires strategy adjustment')
    }
    
    return factors
  }
}
