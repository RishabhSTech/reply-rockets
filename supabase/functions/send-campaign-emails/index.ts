import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendCampaignEmailsRequest {
  campaignId: string;
  provider?: 'openai' | 'claude' | 'lovable';
  providerApiKey?: string;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Verify user is authenticated
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const request: SendCampaignEmailsRequest = await req.json()
        const { campaignId, provider = 'openai', providerApiKey } = request

        // Get campaign and verify ownership
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('user_id', user.id)
            .single()

        if (campaignError || !campaign) {
            return new Response(JSON.stringify({ error: 'Campaign not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }

        // Get all leads for this campaign
        const { data: leads, error: leadsError } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('campaign_id', campaignId)
            .is('campaign_id', 'not.null')

        if (leadsError) {
            throw new Error(`Failed to fetch leads: ${leadsError.message}`)
        }

        if (!leads || leads.length === 0) {
            return new Response(JSON.stringify({ 
                success: true,
                emailsSent: 0,
                message: 'No leads in campaign' 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Get company info
        const { data: companyInfo } = await supabaseClient
            .from('company_info')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

        // Send emails for each lead
        let emailsSent = 0
        const emailPromises = leads.map(async (lead) => {
            try {
                // Generate personalized email
                const generateRes = await supabaseClient.functions.invoke('generate-email', {
                    body: {
                        leadName: lead.name,
                        leadPosition: lead.position,
                        leadCompany: lead.company,
                        leadRequirement: lead.requirement,
                        leadLinkedIn: lead.founder_linkedin,
                        leadWebsite: lead.website_url,
                        tone: campaign.tone || 'professional',
                        companyInfo: companyInfo || {},
                        campaignContext: campaign.prompt_json,
                        provider,
                        providerApiKey,
                    },
                })

                if (generateRes.error) throw generateRes.error

                const { subject, body } = generateRes.data

                // Send email via send-email function
                const sendRes = await supabaseClient.functions.invoke('send-email', {
                    body: {
                        toEmail: lead.email,
                        subject,
                        body,
                        leadId: lead.id,
                        campaignId,
                    },
                })

                if (sendRes.error) throw sendRes.error

                return { success: true, leadId: lead.id }
            } catch (error) {
                console.error(`Failed to send email to ${lead.name}:`, error)
                return { success: false, leadId: lead.id, error }
            }
        })

        const results = await Promise.all(emailPromises)
        emailsSent = results.filter(r => r.success).length

        // Update campaign stats
        await supabaseClient
            .from('campaigns')
            .update({
                emails_sent: campaign.emails_sent + emailsSent,
                last_run_at: new Date().toISOString(),
            })
            .eq('id', campaignId)

        return new Response(JSON.stringify({
            success: true,
            emailsSent,
            total: leads.length,
            results,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Send Campaign Emails Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
