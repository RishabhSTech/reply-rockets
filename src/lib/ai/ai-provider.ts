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
export const providerConfigs: Record<AIProvider, Omit<AIProviderConfig, 'apiKey'>> = {
    claude: {
        name: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-sonnet-20241022', // Latest Claude model
        maxTokens: 1024,
        temperature: 0.7,
    },
    openai: {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini', // Cost-effective GPT-4 variant
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

    let apiKey = '';
    switch (provider) {
        case 'claude':
            apiKey = import.meta.env.VITE_CLAUDE_API_KEY || '';
            break;
        case 'openai':
            apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
            break;
        case 'lovable':
            apiKey = import.meta.env.VITE_LOVABLE_API_KEY || '';
            break;
    }

    if (!apiKey) {
        throw new Error(`API key not configured for provider: ${provider}`);
    }

    return {
        ...config,
        apiKey,
    };
}

/**
 * Call AI provider with unified interface
 */
export async function callAIProvider(
    provider: AIProvider,
    request: AICompletionRequest
): Promise<AICompletionResponse> {
    const config = getProviderConfig(provider);

    switch (provider) {
        case 'claude':
            return callClaude(config, request);
        case 'openai':
            return callOpenAI(config, request);
        case 'lovable':
            return callLovable(config, request);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

/**
 * Claude API implementation
 */
async function callClaude(
    config: AIProviderConfig,
    request: AICompletionRequest
): Promise<AICompletionResponse> {
    const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: request.maxTokens || config.maxTokens,
            temperature: request.temperature ?? config.temperature,
            messages: request.messages.filter(m => m.role !== 'system'),
            system: request.messages.find(m => m.role === 'system')?.content,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
        content: data.content[0].text,
        usage: {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
    };
}

/**
 * OpenAI API implementation
 */
async function callOpenAI(
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
            max_tokens: request.maxTokens || config.maxTokens,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
        content: data.choices[0].message.content,
        usage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
        },
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
