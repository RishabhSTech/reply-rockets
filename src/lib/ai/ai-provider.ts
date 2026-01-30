/**
 * AI Provider Configuration
 * 
 * Centralized configuration for AI providers (Claude, OpenAI, etc.)
 * Allows easy switching between providers while maintaining consistent interface
 */

export type AIProvider = 'claude' | 'openai' | 'lovable';

export interface AIProviderConfig {
    name: AIProvider;
    apiKey: string;
    baseUrl: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
}

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AICompletionRequest {
    messages: AIMessage[];
    temperature?: number;
    maxTokens?: number;
}

export interface AICompletionResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Provider configurations
 * Store API keys in environment variables for security
 */
// Provider naming constants
export const providerConfigs: Record<AIProvider, Omit<AIProviderConfig, 'apiKey'>> = {
    claude: {
        name: 'claude',
        baseUrl: '', // Handle in Edge Function
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1024,
        temperature: 0.7,
    },
    openai: {
        name: 'openai',
        baseUrl: '', // Handle in Edge Function
        model: 'gpt-4o-mini',
        maxTokens: 1024,
        temperature: 0.7,
    },
    lovable: {
        name: 'lovable',
        baseUrl: 'https://ai.gateway.lovable.dev/v1',
        model: 'google/gemini-3-flash-preview',
        maxTokens: 1024,
        temperature: 0.7,
    },
};

/**
 * Get provider configuration with API key from environment
 */
export function getProviderConfig(provider: AIProvider): AIProviderConfig {
    const config = providerConfigs[provider];

    // For Lovable, we might still use client-side key if it's a proxy service designed for frontend
    // For others, we don't need the key in the frontend as it's handled by Edge Function
    let apiKey = '';

    if (provider === 'lovable') {
        apiKey = import.meta.env.VITE_LOVABLE_API_KEY || '';
        if (!apiKey) {
            console.warn(`API key not configured for provider: ${provider}`);
        }
    }

    return {
        ...config,
        apiKey,
    };
}

/**
 * Call AI provider with unified interface
 */
// Import Supabase client to call functions
import { supabase } from "@/integrations/supabase/client";

export async function callAIProvider(
    provider: AIProvider,
    request: AICompletionRequest
): Promise<AICompletionResponse> {
    const config = getProviderConfig(provider);

    // If provider is Lovable, keep existing implementation (assuming it's a frontend gateway)
    // Otherwise, route through Supabase Edge Function
    if (provider === 'lovable') {
        return callLovable(config, request);
    }

    return callEdgeFunction(provider, config, request);
}

/**
 * Call Supabase Edge Function for secure AI processing
 */
async function callEdgeFunction(
    provider: AIProvider,
    config: AIProviderConfig,
    request: AICompletionRequest
): Promise<AICompletionResponse> {
    const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
            provider,
            model: config.model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature,
            maxTokens: request.maxTokens || config.maxTokens,
        },
    });

    if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data) {
        throw new Error('No data returned from AI service');
    }

    return {
        content: data.content,
        usage: data.usage,
    };
}



/**
 * Lovable AI Gateway implementation (existing)
 */
async function callLovable(
    config: AIProviderConfig,
    request: AICompletionRequest
): Promise<AICompletionResponse> {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature,
        }),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        if (response.status === 402) {
            throw new Error('AI credits depleted. Please add funds to continue.');
        }
        const errorText = await response.text();
        throw new Error(`Lovable API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('No content in AI response');
    }

    return {
        content,
        usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
        } : undefined,
    };
}
