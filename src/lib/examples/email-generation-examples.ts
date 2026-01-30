/**
 * Example Usage: AI Email Generation System
 * 
 * This file demonstrates common use cases for the email generation system.
 * Copy and adapt these examples for your specific needs.
 */

import { generateEmail, generateBatchEmails, regenerateEmail, estimateCost } from '@/lib/ai/email-generator';
import type { PromptContext } from '@/lib/prompts/prompt-manager';

// ============================================================================
// Example 1: Basic Email Generation
// ============================================================================

async function example1_basicGeneration() {
    const context: PromptContext = {
        leadName: "Sarah Johnson",
        leadPosition: "VP of Marketing",
        leadCompany: "TechCorp Inc",
        leadRequirement: "Looking to improve email outreach conversion rates",
        leadLinkedIn: "https://linkedin.com/in/sarahjohnson",
        tone: 'professional',
        companyInfo: {
            companyName: "Reply Rocket",
            description: "AI-powered email outreach platform",
            valueProposition: "Increase response rates by 3x with personalized AI emails",
            targetAudience: "B2B SaaS companies",
            keyBenefits: "Save time, increase conversions, scale outreach"
        }
    };

    try {
        const result = await generateEmail(context, {
            provider: 'lovable', // Start with the cheapest
            temperature: 0.7,
            validateOutput: true
        });

        console.log('Subject:', result.email.subject);
        console.log('Body:', result.email.body);
        console.log('Valid:', result.validation?.isValid);
        console.log('Tokens used:', result.usage?.totalTokens);

        if (!result.validation?.isValid) {
            console.log('Validation errors:', result.validation?.errors);
        }
    } catch (error) {
        console.error('Generation failed:', error);
    }
}

// ============================================================================
// Example 2: Batch Email Generation for Campaign
// ============================================================================

async function example2_batchGeneration() {
    const leads = [
        {
            name: "John Smith",
            position: "CEO",
            requirement: "Scaling sales team"
        },
        {
            name: "Emily Chen",
            position: "Head of Sales",
            requirement: "Improving cold email response rates"
        },
        {
            name: "Michael Brown",
            position: "Marketing Director",
            requirement: "Automating outreach campaigns"
        }
    ];

    const companyInfo = {
        companyName: "Reply Rocket",
        description: "AI email outreach platform",
        valueProposition: "3x your response rates",
        targetAudience: "B2B SaaS",
        keyBenefits: "Save time, scale outreach"
    };

    // Convert leads to contexts
    const contexts: PromptContext[] = leads.map(lead => ({
        leadName: lead.name,
        leadPosition: lead.position,
        leadRequirement: lead.requirement,
        tone: 'professional',
        companyInfo
    }));

    try {
        const results = await generateBatchEmails(contexts, {
            provider: 'lovable', // Use cheapest for batch
            validateOutput: true
        });

        results.forEach((result, index) => {
            console.log(`\n--- Email ${index + 1} for ${leads[index].name} ---`);
            console.log('Subject:', result.email.subject);
            console.log('Body:', result.email.body);
            console.log('Valid:', result.validation?.isValid);
        });

        // Calculate total cost
        const totalTokens = results.reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0);
        console.log(`\nTotal tokens used: ${totalTokens}`);
        console.log(`Estimated cost: $${(totalTokens * 0.0000001).toFixed(4)}`);
    } catch (error) {
        console.error('Batch generation failed:', error);
    }
}

// ============================================================================
// Example 3: A/B Testing Different Tones
// ============================================================================

async function example3_abTestingTones() {
    const baseContext: PromptContext = {
        leadName: "Alex Rivera",
        leadPosition: "Founder",
        leadRequirement: "Looking for better email tools",
        tone: 'professional', // Will be overridden
        companyInfo: {
            companyName: "Reply Rocket",
            description: "AI email platform"
        }
    };

    const tones: Array<PromptContext['tone']> = ['professional', 'casual', 'friendly', 'direct'];
    const results = [];

    for (const tone of tones) {
        try {
            const result = await generateEmail(
                { ...baseContext, tone },
                { provider: 'lovable', validateOutput: true }
            );

            results.push({
                tone,
                subject: result.email.subject,
                body: result.email.body,
                valid: result.validation?.isValid
            });

            console.log(`\n--- ${tone.toUpperCase()} Tone ---`);
            console.log('Subject:', result.email.subject);
            console.log('Body:', result.email.body.substring(0, 100) + '...');
        } catch (error) {
            console.error(`Failed for ${tone}:`, error);
        }
    }

    // Compare results
    console.log('\n--- Comparison ---');
    results.forEach(r => {
        console.log(`${r.tone}: "${r.subject}"`);
    });
}

// ============================================================================
// Example 4: Provider Comparison (Quality vs Cost)
// ============================================================================

async function example4_providerComparison() {
    const context: PromptContext = {
        leadName: "Jessica Martinez",
        leadPosition: "VP Sales",
        leadRequirement: "Need to scale outbound sales",
        tone: 'professional',
        companyInfo: {
            companyName: "Reply Rocket",
            description: "AI email platform",
            valueProposition: "3x response rates"
        }
    };

    const providers: Array<'lovable' | 'openai' | 'claude'> = ['lovable', 'openai', 'claude'];

    for (const provider of providers) {
        try {
            console.log(`\n--- Testing ${provider.toUpperCase()} ---`);

            const result = await generateEmail(context, {
                provider,
                validateOutput: true
            });

            console.log('Subject:', result.email.subject);
            console.log('Body:', result.email.body);
            console.log('Tokens:', result.usage?.totalTokens);
            console.log('Valid:', result.validation?.isValid);

            // Estimate cost
            const costPerToken = provider === 'lovable' ? 0.0000001 :
                provider === 'openai' ? 0.000001 : 0.000003;
            const cost = (result.usage?.totalTokens || 0) * costPerToken;
            console.log('Cost:', `$${cost.toFixed(6)}`);
        } catch (error) {
            console.error(`${provider} failed:`, error);
        }
    }
}

// ============================================================================
// Example 5: Cost Estimation Before Generation
// ============================================================================

async function example5_costEstimation() {
    const context: PromptContext = {
        leadName: "David Kim",
        leadPosition: "CTO",
        leadRequirement: "Evaluating email automation tools",
        tone: 'professional',
        companyInfo: {
            companyName: "Reply Rocket",
            description: "AI email platform"
        }
    };

    // Estimate cost for different providers
    const providers: Array<'lovable' | 'openai' | 'claude'> = ['lovable', 'openai', 'claude'];

    console.log('--- Cost Estimation ---\n');

    providers.forEach(provider => {
        const estimate = estimateCost(context, provider);

        const costPerToken = provider === 'lovable' ? 0.0000001 :
            provider === 'openai' ? 0.000001 : 0.000003;
        const estimatedCost = estimate.estimatedTotalTokens * costPerToken;

        console.log(`${provider.toUpperCase()}:`);
        console.log(`  Estimated tokens: ${estimate.estimatedTotalTokens}`);
        console.log(`  Estimated cost: $${estimatedCost.toFixed(6)}`);
        console.log(`  For 1000 emails: $${(estimatedCost * 1000).toFixed(2)}\n`);
    });
}

// ============================================================================
// Example 6: Regeneration with Different Parameters
// ============================================================================

async function example6_regeneration() {
    const context: PromptContext = {
        leadName: "Lisa Anderson",
        leadPosition: "Marketing Manager",
        leadRequirement: "Improving email campaigns",
        tone: 'professional',
        companyInfo: {
            companyName: "Reply Rocket",
            description: "AI email platform"
        }
    };

    // Generate initial email
    console.log('--- Initial Generation (Professional) ---');
    const initial = await generateEmail(context, {
        provider: 'lovable',
        validateOutput: true
    });

    console.log('Subject:', initial.email.subject);
    console.log('Body:', initial.email.body);

    // Regenerate with different tone
    console.log('\n--- Regenerated (Casual) ---');
    const regenerated = await regenerateEmail(context, initial, {
        tone: 'casual'
    });

    console.log('Subject:', regenerated.email.subject);
    console.log('Body:', regenerated.email.body);

    // Regenerate with different provider for higher quality
    console.log('\n--- Regenerated (Claude for Quality) ---');
    const premium = await regenerateEmail(context, initial, {
        provider: 'claude'
    });

    console.log('Subject:', premium.email.subject);
    console.log('Body:', premium.email.body);
}

// ============================================================================
// Example 7: Handling Validation Errors
// ============================================================================

async function example7_validationHandling() {
    const context: PromptContext = {
        leadName: "Robert Taylor",
        leadPosition: "Sales Director",
        leadRequirement: "Need innovative solutions for synergy", // Contains forbidden words!
        tone: 'professional',
        companyInfo: {
            companyName: "Reply Rocket",
            description: "Cutting-edge platform" // Also contains forbidden word!
        }
    };

    try {
        const result = await generateEmail(context, {
            provider: 'lovable',
            validateOutput: true
        });

        if (!result.validation?.isValid) {
            console.log('⚠️ Validation failed:');
            result.validation?.errors.forEach(error => {
                console.log(`  - ${error}`);
            });

            console.log('\n💡 Suggestions:');
            console.log('  - Remove forbidden words from context');
            console.log('  - Adjust temperature for more conservative output');
            console.log('  - Try a different provider');

            // Retry with cleaned context
            const cleanedContext = {
                ...context,
                leadRequirement: "Need better solutions for collaboration",
                companyInfo: {
                    ...context.companyInfo,
                    description: "Modern email platform"
                }
            };

            console.log('\n--- Retrying with cleaned context ---');
            const retryResult = await generateEmail(cleanedContext, {
                provider: 'lovable',
                validateOutput: true
            });

            console.log('✅ Success!');
            console.log('Subject:', retryResult.email.subject);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Example 8: Industry-Specific Context
// ============================================================================

async function example8_industryContext() {
    const context: PromptContext = {
        leadName: "Maria Garcia",
        leadPosition: "E-commerce Manager",
        leadRequirement: "High cart abandonment rate",
        tone: 'professional',
        companyInfo: {
            companyName: "Reply Rocket",
            description: "Email automation for e-commerce",
            valueProposition: "Recover lost sales with AI emails",
            targetAudience: "E-commerce businesses",
            keyBenefits: "Reduce cart abandonment, increase conversions"
        }
    };

    // You can reference industry-specific pain points from templates
    // The AI will automatically use relevant context based on the lead's requirement

    const result = await generateEmail(context, {
        provider: 'lovable',
        validateOutput: true
    });

    console.log('--- E-commerce Focused Email ---');
    console.log('Subject:', result.email.subject);
    console.log('Body:', result.email.body);
}

// ============================================================================
// Run Examples
// ============================================================================

// Uncomment to run specific examples:

// example1_basicGeneration();
// example2_batchGeneration();
// example3_abTestingTones();
// example4_providerComparison();
// example5_costEstimation();
// example6_regeneration();
// example7_validationHandling();
// example8_industryContext();

export {
    example1_basicGeneration,
    example2_batchGeneration,
    example3_abTestingTones,
    example4_providerComparison,
    example5_costEstimation,
    example6_regeneration,
    example7_validationHandling,
    example8_industryContext
};
