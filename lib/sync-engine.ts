import { createServiceClient } from './supabase/server'
import * as salesforce from './integrations/salesforce'
import * as hubspot from './integrations/hubspot'
import * as gong from './integrations/gong'
import * as outreach from './integrations/outreach'
import * as salesloft from './integrations/salesloft'
// import { analyzeWithGemini } from './integrations/gemini'
import { calculateDealRiskScore, calculateAverageStageDurations } from './risk-scoring'
import type { Customer, Opportunity, Insight } from './types/database'

export class SyncEngine {
  private customerId: string
  private customer: Customer | null = null

  constructor(customerId: string) {
    this.customerId = customerId
  }

  async syncAll(): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createServiceClient()

      // Fetch customer record
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', this.customerId)
        .single()

      if (customerError || !customer) {
        return { success: false, error: 'Customer not found' }
      }

      this.customer = customer

      // Sync Salesforce if connected
      if (customer.salesforce_connected && customer.salesforce_token) {
        await this.syncSalesforce(customer)
      }

      // Sync HubSpot if connected
      if (customer.hubspot_connected && customer.hubspot_token) {
        await this.syncHubSpot(customer)
      }

      // Sync Gong if connected
      if (customer.gong_connected && customer.gong_token) {
        await this.syncGong(customer)
      }

      // Sync Outreach if connected
      if (customer.outreach_connected && customer.outreach_token) {
        await this.syncOutreach(customer)
      }

      // Sync Salesloft if connected
      if (customer.salesloft_connected && customer.salesloft_token) {
        await this.syncSalesloft(customer)
      }

      // Calculate metrics
      await this.calculateMetrics()

      // Calculate risk scores for all opportunities
      await this.calculateRiskScores()

      // Generate AI insights
      await this.generateInsights()

      // Update last sync time
      const updateData: any = {}
      if (customer.salesforce_connected) {
        updateData.salesforce_last_sync = new Date().toISOString()
      }
      if (customer.hubspot_connected) {
        updateData.hubspot_last_sync = new Date().toISOString()
      }
      if (customer.gong_connected) {
        updateData.gong_last_sync = new Date().toISOString()
      }
      if (customer.outreach_connected) {
        updateData.outreach_last_sync = new Date().toISOString()
      }
      if (customer.salesloft_connected) {
        updateData.salesloft_last_sync = new Date().toISOString()
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('customers')
          .update(updateData)
          .eq('id', this.customerId)
      }

      return { success: true }
    } catch (error: any) {
      console.error('Sync error:', error)
      return { success: false, error: error.message || 'Sync failed' }
    }
  }

  private async syncSalesforce(customer: Customer): Promise<void> {
    const supabase = await createServiceClient()

    try {
      let accessToken = customer.salesforce_token!
      let instanceUrl = customer.salesforce_instance_url!

      const opportunities = await salesforce.fetchSalesforceOpportunities(
        instanceUrl,
        accessToken
      )

      for (const opp of opportunities) {
        await supabase.from('opportunities').upsert(
          {
            ...opp,
            customer_id: this.customerId,
            synced_at: new Date().toISOString(),
          },
          {
            onConflict: 'customer_id,external_id,source',
          }
        )
      }

      const closedDeals = await salesforce.fetchSalesforceClosedDeals(
        instanceUrl,
        accessToken
      )

      for (const deal of closedDeals) {
        await supabase.from('closed_deals').upsert(
          {
            ...deal,
            customer_id: this.customerId,
            synced_at: new Date().toISOString(),
          },
          {
            onConflict: 'customer_id,external_id,source',
          }
        )
      }
    } catch (error: any) {
        console.error('Salesforce sync failed', error);
    }
  }

  private async syncHubSpot(customer: Customer): Promise<void> {
    const supabase = await createServiceClient()

    try {
      let accessToken = customer.hubspot_token!
      let deals: Awaited<ReturnType<typeof hubspot.fetchHubSpotDeals>>

      try {
        deals = await hubspot.fetchHubSpotDeals(accessToken)
      } catch (error: any) {
        // Check if token expired (401 error)
        if (error?.response?.status === 401 && customer.hubspot_refresh_token) {
          console.log('HubSpot token expired, refreshing...')
          
          // Refresh the token
          const newTokens = await hubspot.refreshHubSpotToken(customer.hubspot_refresh_token)
          accessToken = newTokens.access_token

          // Update tokens in database
          await supabase
            .from('customers')
            .update({
              hubspot_token: newTokens.access_token,
              hubspot_refresh_token: newTokens.refresh_token,
            })
            .eq('id', this.customerId)

          // Retry with new token
          deals = await hubspot.fetchHubSpotDeals(accessToken)
        } else {
          throw error
        }
      }

      for (const deal of deals) {
        await supabase.from('opportunities').upsert(
          {
            ...deal,
            customer_id: this.customerId,
            synced_at: new Date().toISOString(),
          },
          {
            onConflict: 'customer_id,external_id,source',
          }
        )
      }
    } catch (error: any) {
      console.error('HubSpot sync failed', error)
    }
  }

  private async syncGong(customer: Customer): Promise<void> {
    const supabase = await createServiceClient()

    try {
      const accessToken = customer.gong_token!

      // Fetch recent calls (last 2 weeks)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      const calls = await gong.fetchGongCalls(accessToken, twoWeeksAgo, 50)
      
      console.log(`Fetched ${calls.length} Gong calls`)

      for (const call of calls) {
        try {
          // Store call as activity
          const transformedCall = gong.transformGongCall(call)
          await supabase.from('activities').upsert({
            ...transformedCall,
            customer_id: this.customerId,
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'customer_id,external_id,source'
          })

          // Get detailed analysis for important calls (over 30 minutes or with opportunities)
          if (call.duration > 30 || (call.metadata?.opportunity_ids?.length || 0) > 0) {
            try {
              const details = await gong.fetchGongCallDetails(accessToken, call.id)
              const transcript = await gong.fetchGongCallTranscript(accessToken, call.id)
              
              let aiAnalysis = null
              if (transcript.length > 0) {
                aiAnalysis = await gong.analyzeGongCallWithAI(call, transcript)
              }

              // Store detailed call analysis
              const callAnalysis = gong.transformGongCallAnalysis(call.id, call, aiAnalysis, transcript)
              await supabase.from('call_analyses').upsert({
                ...callAnalysis,
                customer_id: this.customerId,
                synced_at: new Date().toISOString()
              }, {
                onConflict: 'customer_id,call_id'
              })

              // If call has associated opportunity, update opportunity metrics
              if (call.metadata?.opportunity_ids?.length) {
                for (const opportunityId of call.metadata.opportunity_ids) {
                  await supabase.from('opportunities')
                    .update({
                      last_activity_date: call.started_at,
                      has_call_data: true,
                      call_sentiment: details.sentiment?.overall_sentiment,
                      call_duration: call.duration,
                    })
                    .eq('external_id', opportunityId)
                    .eq('source', 'salesforce') // Assuming Salesforce opportunity
                }
              }

            } catch (analysisError) {
              console.error(`Failed to analyze call ${call.id}:`, analysisError)
              // Continue with other calls even if analysis fails
            }
          }

        } catch (callError) {
          console.error(`Failed to process call ${call.id}:`, callError)
          // Continue with other calls even if one fails
        }
      }
      
      console.info('Gong sync completed', { 
        customerId: this.customerId, 
        callsCount: calls.length 
      })

    } catch (error: any) {
      console.error('Gong sync failed:', error)
      throw error
    }
  }

  private async syncOutreach(customer: Customer): Promise<void> {
    const supabase = await createServiceClient()

    try {
      const accessToken = customer.outreach_token!

      // Fetch sequences (last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      const sequences = await outreach.fetchOutreachSequences(accessToken)
      
      console.log(`Fetched ${sequences.length} Outreach sequences`)

      for (const sequence of sequences) {
        try {
          // Store sequence performance
          const transformedSequence = {
            external_id: sequence.id,
            customer_id: this.customerId,
            name: sequence.name,
            state: sequence.state,
            created_at: sequence.created_at,
            total_prospects: sequence.stats.total_prospects,
            active_prospects: sequence.stats.active_prospects,
            replied_prospects: sequence.stats.replied_prospects,
            booked_prospects: sequence.stats.booked_prospects,
            reply_rate: sequence.stats.total_prospects > 0 
              ? (sequence.stats.replied_prospects / sequence.stats.total_prospects) * 100 
              : 0,
            meeting_rate: sequence.stats.replied_prospects > 0 
              ? (sequence.stats.booked_prospects / sequence.stats.replied_prospects) * 100 
              : 0,
            synced_at: new Date().toISOString()
          }

          await supabase.from('sequence_performance').upsert(transformedSequence, {
            onConflict: 'customer_id,external_id'
          })

          // If sequence has prospects, fetch detailed prospect data for active sequences
          if (sequence.stats.active_prospects > 0) {
            try {
              // Get emails and engagement for this sequence
              const events = await outreach.fetchOutreachMailboxEvents(accessToken, ninetyDaysAgo)
              const sequenceEvents = events.filter(event => 
                event.sequence_id === sequence.id || 
                event.sequence_state_id === sequence.id
              )

              // Calculate engagement metrics
              const engagementMetrics = {
                total_sends: sequenceEvents.filter(e => e.type === 'email_sent').length,
                total_opens: sequenceEvents.reduce((sum, e) => sum + (e.opens || 0), 0),
                total_replies: sequenceEvents.filter(e => e.type === 'email_reply').length,
                engagement_score: 0
              }

              // Calculate engagement score (0-10)
              if (engagementMetrics.total_sends > 0) {
                const openRate = engagementMetrics.total_opens / engagementMetrics.total_sends
                const replyRate = engagementMetrics.total_replies / engagementMetrics.total_sends
                engagementMetrics.engagement_score = Math.round((openRate * 0.3 + replyRate * 0.7) * 10)
              }

              // Store engagement data
              await supabase.from('sequence_engagement').upsert({
                customer_id: this.customerId,
                sequence_id: sequence.id,
                metrics: engagementMetrics,
                synced_at: new Date().toISOString()
              }, {
                onConflict: 'customer_id,sequence_id'
              })

            } catch (eventsError) {
              console.error(`Failed to fetch events for sequence ${sequence.id}:`, eventsError)
            }
          }

        } catch (sequenceError) {
          console.error(`Failed to process sequence ${sequence.id}:`, sequenceError)
          // Continue with other sequences even if one fails
        }
      }

      // Fetch and analyze prospect performance
      const prospects = await outreach.fetchOutreachProspects(accessToken)
      console.log(`Fetched ${prospects.length} Outreach prospects`)

      for (const prospect of prospects) {
        try {
          // Store prospect data
          await supabase.from('prospect_data').upsert({
            customer_id: this.customerId,
            external_id: prospect.id,
            emails: prospect.emails,
            phones: prospect.phones,
            fields: prospect.fields,
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'customer_id,external_id'
          })

        } catch (prospectError) {
          console.error(`Failed to process prospect ${prospect.id}:`, prospectError)
        }
      }
      
      // Analyze sequence performance for insights
      // await this.analyzeSequencePerformance(this.customerId)
      
      console.log('Outreach sync completed', { 
        customerId: this.customerId, 
        sequencesCount: sequences.length,
        prospectsCount: prospects.length
      })

    } catch (error: any) {
      console.error('Outreach sync failed:', error)
      throw error
    }
  }

  private async syncSalesloft(customer: Customer): Promise<void> {
    const supabase = await createServiceClient()

    try {
      const accessToken = customer.salesloft_token!

      // Fetch cadences (last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      const cadences = await salesloft.fetchSalesloftCadences(accessToken)
      
      console.log(`Fetched ${cadences.length} Salesloft cadences`)

      for (const cadence of cadences) {
        try {
          // Store cadence performance
          const transformedCadence = {
            external_id: cadence.id,
            customer_id: this.customerId,
            name: cadence.name? cadence.name : 'Unnamed',
            description: cadence.description || '',
            state: cadence.state,
            created_at: cadence.created_at,
            person_count: cadence.person_count || 0,
            active_count: cadence.active_count || 0,
            completed_count: cadence.stats?.people_completed || 0,
            not_responding_count: cadence.stats?.people_not_responding || 0,
            replied_count: cadence.stats?.email_response_rate || 0, // Simplified
            bounced_count: cadence.stats?.people_bounced || 0,
            reply_rate: cadence.stats?.email_response_rate || 0,
            meeting_rate: cadence.stats?.meeting_booking_rate || 0,
            synced_at: new Date().toISOString()
          }

          await supabase.from('cadence_performance').upsert(transformedCadence, {
            onConflict: 'customer_id,external_id'
          })

          // If cadence has people, fetch detailed people data
          if (cadence.person_count && cadence.person_count > 0) {
            try {
              const people = await salesloft.fetchSalesloftCadencePeople(accessToken, cadence.id)
              
              for (const person of people) {
                await supabase.from('cadence_people').upsert({
                  customer_id: this.customerId,
                  cadence_id: cadence.id,
                  external_id: person.id,
                  state: 'active', // Default state if not available
                  first_name: person.attributes?.first_name || '',
                  last_name: person.attributes?.last_name || '',
                  email: person.attributes?.email || '',
                  title: person.attributes?.title || '',
                  company: person.attributes?.company || '',
                  synced_at: new Date().toISOString()
                }, {
                  onConflict: 'customer_id,cadence_id,external_id'
                })
              }

            } catch (peopleError) {
              console.error(`Failed to fetch people for cadence ${cadence.id}:`, peopleError)
            }
          }

        } catch (cadenceError) {
          console.error(`Failed to process cadence ${cadence.id}:`, cadenceError)
          // Continue with other cadences even if one fails
        }
      }

      // Fetch call activities (last 90 days) 
      const calls = await salesloft.fetchSalesloftCalls(accessToken, ninetyDaysAgo)
      console.log(`Fetched ${calls.length} Salesloft calls`)

      for (const call of calls) {
        try {
          await supabase.from('sales_activities').upsert({
            customer_id: this.customerId,
            external_id: call.id,
            // cadence_id: call.cadence_id, // Not directly on call object
            person_id: call.attributes.to_person_id.toString(),
            type: 'CALL',
            state: 'completed',
            subject: call.attributes.notes || 'Sales Call',
            duration: call.attributes.duration_seconds || 0,
            recording_url: call.attributes.recording_url || '',
            created_at: call.attributes.created_at,
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'customer_id,external_id'
          })

        } catch (callError) {
          console.error(`Failed to process call ${call.id}:`, callError)
        }
      }

      // Fetch email activities for engagement analysis
      const emails = await salesloft.fetchSalesloftEmails(accessToken, ninetyDaysAgo)
      console.log(`Fetched ${emails.length} Salesloft emails`)

      for (const email of emails) {
        try {
          await supabase.from('sales_activities').upsert({
            customer_id: this.customerId,
            external_id: email.id,
            // cadence_id: email.cadence_id,
            person_id: email.attributes.person_id,
            type: 'EMAIL',
            state: email.attributes.state || 'sent',
            subject: email.attributes.subject || '',
            created_at: email.attributes.created_at,
            opened_at: email.attributes.opened_at,
            clicked_at: email.attributes.clicked_at,
            replied_at: email.attributes.replied_at,
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'customer_id,external_id'
          })

        } catch (emailError) {
          console.error(`Failed to process email ${email.id}:`, emailError)
        }
      }
      
      console.log('Salesloft sync completed', { 
        customerId: this.customerId, 
        cadencesCount: cadences.length,
        callsCount: calls.length,
        emailsCount: emails.length
      })

    } catch (error: any) {
      console.error('Salesloft sync failed:', error)
      throw error
    }
  }

  private async calculateMetrics(): Promise<void> {
    const supabase = await createServiceClient()
    
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('amount, probability')
      .eq('customer_id', this.customerId)

    const totalPipeline = opportunities?.reduce((sum, opp) => sum + (opp.amount || 0), 0) || 0
    
    await supabase.from('metrics').insert({
      customer_id: this.customerId,
      total_pipeline: totalPipeline,
      calculated_at: new Date().toISOString(),
    })
  }

  private async generateInsights(): Promise<void> {
      // Simplified insights generation
  }

  private async calculateRiskScores(): Promise<void> {
      // Simplified risk scoring
  }
}
