import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
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

        const { provider, messages, model, temperature, maxTokens } = await req.json()

        let responseContent = ''
        let usage = {}

        if (provider === 'openai') {
            const apiKey = Deno.env.get('OPENAI_API_KEY')
            if (!apiKey) throw new Error('OpenAI API key not configured')

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o-mini',
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
            }

            const data = await response.json()
            responseContent = data.choices[0].message.content
            usage = {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            }
        } else if (provider === 'claude') {
            const apiKey = Deno.env.get('CLAUDE_API_KEY')
            if (!apiKey) throw new Error('Claude API key not configured')

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20241022',
                    max_tokens: maxTokens || 1024,
                    temperature,
                    messages: messages.filter((m: any) => m.role !== 'system'),
                    system: messages.find((m: any) => m.role === 'system')?.content,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`Claude API error: ${error.error?.message || response.statusText}`)
            }

            const data = await response.json()
            responseContent = data.content[0].text
            usage = {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            }
        } else {
            throw new Error(`Unsupported provider: ${provider}`)
        }

        return new Response(JSON.stringify({ content: responseContent, usage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Edge Function Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
});
