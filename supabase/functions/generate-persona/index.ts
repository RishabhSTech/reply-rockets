import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePersonaRequest {
  founderLinkedIn?: string;
  websiteUrl?: string;
  leadName: string;
  leadPosition: string;
  leadCompany?: string;
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

        const request: GeneratePersonaRequest = await req.json()
        const provider = request.provider || 'openai'
        const providerApiKey = request.providerApiKey

        // Validate that we have enough data
        if (!request.founderLinkedIn && !request.websiteUrl) {
            return new Response(JSON.stringify({ 
                error: 'Either founderLinkedIn or websiteUrl is required' 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Build research context
        let researchContext = ''
        if (request.founderLinkedIn) {
            researchContext += `LinkedIn Profile: ${request.founderLinkedIn}\n`
        }
        if (request.websiteUrl) {
            researchContext += `Company Website: ${request.websiteUrl}\n`
        }

        const systemPrompt = `You are an expert at generating detailed professional personas from minimal information. 
Your task is to create a comprehensive persona profile for a business professional based on available research signals.

OUTPUT FORMAT (JSON ONLY):
{
  "title": "Professional title/role summary",
  "industry": "Primary industry",
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "priorities": ["priority 1", "priority 2", "priority 3"],
  "recentActivities": ["activity 1", "activity 2"],
  "icebreakerHooks": ["hook 1", "hook 2", "hook 3"],
  "openingLines": ["opening line 1", "opening line 2"],
  "companyContext": "Brief company context if available",
  "keyTakeaways": "Key insights for personalization"
}`

        const userPrompt = `Generate a detailed persona and email opening strategy for:

NAME: ${request.leadName}
POSITION: ${request.leadPosition}
${request.leadCompany ? `COMPANY: ${request.leadCompany}` : ''}

RESEARCH SIGNALS:
${researchContext}

Based on these signals, provide:
1. Their likely professional priorities
2. Common pain points in their role
3. Recent industry trends affecting them
4. Specific icebreaker hooks (reference-worthy observations)
5. Cold email opener lines that feel personalized`

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ]

        let responseContent = ''

        if (provider === 'openai') {
            const apiKey = providerApiKey || Deno.env.get('OPENAI_API_KEY')
            if (!apiKey) throw new Error('OpenAI API key not configured')

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages,
                    temperature: 0.7,
                    max_tokens: 1024,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
            }

            const data = await response.json()
            responseContent = data.choices[0].message.content
        } else if (provider === 'claude') {
            const apiKey = providerApiKey || Deno.env.get('CLAUDE_API_KEY')
            if (!apiKey) throw new Error('Claude API key not configured')

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1024,
                    temperature: 0.7,
                    messages: messages.filter((m: any) => m.role !== 'system'),
                    system: systemPrompt,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`Claude API error: ${error.error?.message || response.statusText}`)
            }

            const data = await response.json()
            responseContent = data.content[0].text
        } else if (provider === 'lovable') {
            const apiKey = Deno.env.get('LOVABLE_API_KEY')
            if (!apiKey) throw new Error('Lovable API key not configured')

            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'google/gemini-3-flash-preview',
                    messages,
                    temperature: 0.7,
                }),
            })

            if (!response.ok) {
                throw new Error(`Lovable API error: ${response.statusText}`)
            }

            const data = await response.json()
            responseContent = data.choices?.[0]?.message?.content || ""
        } else {
            throw new Error(`Unsupported provider: ${provider}`)
        }

        // Parse JSON response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response as JSON')
        }

        const personaData = JSON.parse(jsonMatch[0])

        return new Response(JSON.stringify({ persona: personaData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Generate Persona Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
