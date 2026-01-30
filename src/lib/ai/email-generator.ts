/**
 * Email Generation Service
 * 
 * High-level service that combines prompt templates with AI providers
 * to generate personalized cold emails efficiently.
 */

import {
    buildSystemPrompt,
    buildUserPrompt,
    validateEmail,
    type PromptContext,
    type GeneratedEmail,
} from '../prompts/prompt-manager';
import {
    callAIProvider,
    type AIProvider,
    type AIMessage,
} from './ai-provider';

export interface EmailGenerationOptions {
    provider?: AIProvider;
    temperature?: number;
    validateOutput?: boolean;
}

export interface EmailGenerationResult {
    email: GeneratedEmail;
    validation?: {
        isValid: boolean;
        errors: string[];
    };
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    provider: AIProvider;
}

/**
 * Generate a personalized cold email using AI
 * 
 * This is the main entry point for email generation.
 * It handles prompt building, AI calling, and validation.
 */
export async function generateEmail(
    context: PromptContext,
    options: EmailGenerationOptions = {}
): Promise<EmailGenerationResult> {
    const {
        provider = 'lovable', // Default to lovable (already configured)
        temperature = 0.7,
        validateOutput = true,
    } = options;

    // Build optimized prompts
    const systemPrompt = buildSystemPrompt(context.companyInfo);
    const userPrompt = buildUserPrompt(context);

    // Prepare messages
    const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];

    // Call AI provider
    const response = await callAIProvider(provider, {
        messages,
        temperature,
        maxTokens: 1024,
    });

    // Parse the JSON response
    const email = parseEmailResponse(response.content);

    // Validate if requested
    let validation;
    if (validateOutput) {
        validation = validateEmail(email);
    }

    return {
        email,
        validation,
        usage: response.usage,
        provider,
    };
}

/**
 * Parse AI response to extract email data
 * Handles various response formats (JSON, markdown-wrapped JSON, etc.)
 */
function parseEmailResponse(content: string): GeneratedEmail {
    try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                subject: parsed.subject || 'Quick question',
                body: parsed.body || content,
            };
        }
    } catch (error) {
        console.error('Failed to parse AI response as JSON:', error);
    }

    // Fallback: try to extract subject and body manually
    const subjectMatch = content.match(/subject["\s:]+([^\n"]+)/i);
    const bodyMatch = content.match(/body["\s:]+([^\n"]+)/i);

    return {
        subject: subjectMatch?.[1]?.trim() || 'Quick question',
        body: bodyMatch?.[1]?.trim() || content,
    };
}

/**
 * Batch generate emails for multiple leads
 * Useful for campaign creation
 */
export async function generateBatchEmails(
    contexts: PromptContext[],
    options: EmailGenerationOptions = {}
): Promise<EmailGenerationResult[]> {
    const results: EmailGenerationResult[] = [];

    // Process sequentially to avoid rate limits
    for (const context of contexts) {
        try {
            const result = await generateEmail(context, options);
            results.push(result);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`Failed to generate email for ${context.leadName}:`, error);
            // Continue with other leads even if one fails
        }
    }

    return results;
}

/**
 * Regenerate email with different parameters
 * Useful for A/B testing different tones or providers
 */
export async function regenerateEmail(
    context: PromptContext,
    previousResult: EmailGenerationResult,
    changes: Partial<PromptContext & EmailGenerationOptions>
): Promise<EmailGenerationResult> {
    const newContext = { ...context, ...changes };
    const newOptions = {
        provider: changes.provider || previousResult.provider,
        temperature: changes.temperature,
        validateOutput: true,
    };

    return generateEmail(newContext, newOptions);
}

/**
 * Get cost estimate for email generation
 * Helps users understand token usage
 */
export function estimateCost(
    context: PromptContext,
    provider: AIProvider = 'lovable'
): {
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    estimatedTotalTokens: number;
    provider: AIProvider;
} {
    // Rough estimation based on character count
    const systemPrompt = buildSystemPrompt(context.companyInfo);
    const userPrompt = buildUserPrompt(context);

    const totalChars = systemPrompt.length + userPrompt.length;
    const estimatedPromptTokens = Math.ceil(totalChars / 4); // ~4 chars per token
    const estimatedCompletionTokens = 300; // Typical email response

    return {
        estimatedPromptTokens,
        estimatedCompletionTokens,
        estimatedTotalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        provider,
    };
}
