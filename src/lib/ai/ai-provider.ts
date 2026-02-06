/**
 * AI Provider Configuration
 * 
 * Centralized configuration for AI providers (Claude, OpenAI, etc.)
 * Allows easy switching between providers while maintaining consistent interface
 */

export type AIProvider = 'claude' | 'openai' | 'lovable';
export type OpenAIModel = 'gpt-4-turbo' | 'gpt-4.1' | 'gpt-4o' | 'gpt-4o-mini';

export interface AIProviderConfig {
    name: AIProvider;
    apiKey: string;
    baseUrl: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
}

export interface ModelInfo {
    displayName: string;
    costPer1MTokens: string;
    speed: 'Very Fast' | 'Fast' | 'Medium' | 'Slow';
    quality: 'Good' | 'Very Good' | 'Excellent' | 'State-of-the-art';
    contextWindow: number;
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
// OpenAI Model Configurations
export const openaiModels: Record<OpenAIModel, ModelInfo> = {
    'gpt-4.1': {
        displayName: 'GPT-4.1 (Latest)',
        costPer1MTokens: '$3/$15',
        speed: 'Fast',
        quality: 'State-of-the-art',
        contextWindow: 128000,
    },
    'gpt-4-turbo': {
        displayName: 'GPT-4 Turbo',
        costPer1MTokens: '$10/$30',
        speed: 'Fast',
        quality: 'Excellent',
        contextWindow: 128000,
    },
    'gpt-4o': {
        displayName: 'GPT-4o',
        costPer1MTokens: '$5/$15',
        speed: 'Very Fast',
        quality: 'Excellent',
        contextWindow: 128000,
    },
    'gpt-4o-mini': {
        displayName: 'GPT-4o Mini',
        costPer1MTokens: '$0.15/$0.60',
        speed: 'Very Fast',
        quality: 'Very Good',
        contextWindow: 128000,
    },
};

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
        model: 'gpt-4.1', // Updated to latest OpenAI model
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
 * Get user's selected AI provider and model from localStorage
 * Falls back to 'lovable' if no selection made
 */
export function getUserSelectedProvider(): {
    provider: AIProvider;
    model?: OpenAIModel;
} {
    if (typeof window === 'undefined') {
        // Server-side rendering fallback
        return { provider: 'lovable' };
    }

    const savedProvider = (localStorage.getItem('ai_provider') as AIProvider) || 'lovable';
    const selectedModel = (localStorage.getItem('openai_model') as OpenAIModel) || 'gpt-4.1';

    return {
        provider: savedProvider,
        model: savedProvider === 'openai' ? selectedModel : undefined,
    };
}

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
 * Get provider config with user's selected model (for OpenAI)
 */
export function getConfigForUserProvider(): AIProviderConfig {
    const { provider, model } = getUserSelectedProvider();
    const config = getProviderConfig(provider);

    // Override model if user selected a specific OpenAI model
    if (provider === 'openai' && model) {
        return {
            ...config,
            model, // Will use the OpenAI model string (e.g., 'gpt-4.1')
        };
    }

    return config;
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
