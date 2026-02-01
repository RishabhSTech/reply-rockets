/**
 * Prompt Template Manager
 * 
 * Cost-effective utility for loading and managing AI prompt templates.
 * Minimizes token usage by loading templates once and reusing them.
 */

import emailTemplates from './email-templates.json';

export type ToneType = 'professional' | 'casual' | 'friendly' | 'direct';

export interface PromptContext {
    leadName: string;
    leadPosition: string;
    leadCompany?: string;
    leadRequirement: string;
    leadLinkedIn?: string;
    leadWebsite?: string;
    companyInfo?: {
        companyName?: string;
        description?: string;
        valueProposition?: string;
        targetAudience?: string;
        keyBenefits?: string;
    };
    tone: ToneType;
    previousEmails?: {
        subject: string;
        body: string;
        sentAt: string;
    }[];
}

export interface GeneratedEmail {
    subject: string;
    body: string;
}

/**
 * Builds a token-efficient system prompt by combining core principles
 * with specific context. This approach minimizes redundancy.
 */
export function buildSystemPrompt(companyInfo?: PromptContext['companyInfo']): string {
    const { cmo_bot_context, cold_email_framework } = emailTemplates;
    const { cold_email_writer } = emailTemplates.templates;

    // Core principles from CMO bot context
    const corePrinciples = `You are an elite ${cmo_bot_context.role}.

POSITIONING:
${cmo_bot_context.positioning}

WRITING PRINCIPLES:
${cmo_bot_context.writing_principles.map(p => `- ${p}`).join('\n')}

TONE RULES:
${cmo_bot_context.tone_rules.map(t => `- ${t}`).join('\n')}

AVOID ALL:
${cmo_bot_context.forbidden_language.map(f => `- ${f}`).join('\n')}

EMAIL FRAMEWORK:
${cold_email_framework.mandatory_structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

SUBJECT LINE RULES:
${cold_email_framework.subject_line_rules.map(r => `- ${r}`).join('\n')}

CTA APPROACH:
${cold_email_framework.cta_rules.map(c => `- ${c}`).join('\n')}`;

    // Add company context if available
    const companyContext = companyInfo?.companyName
        ? `\n\nYOUR COMPANY:
- Name: ${companyInfo.companyName}
- What we do: ${companyInfo.description || 'Not specified'}
- Value prop: ${companyInfo.valueProposition || 'Not specified'}
- Target: ${companyInfo.targetAudience || 'Not specified'}
- Benefits: ${companyInfo.keyBenefits || 'Not specified'}`
        : '';

    return `${corePrinciples}${companyContext}

OUTPUT FORMAT (JSON only):
{
  "subject": "subject line here",
  "body": "email body with {{name}} placeholder"
}`;
}

/**
 * Builds a concise user prompt with lead-specific context
 */
export function buildUserPrompt(context: PromptContext): string {
    const { tone_variations } = emailTemplates;
    const toneDesc = tone_variations[context.tone]?.description || 'professional';

    return `Write a ${context.tone} email (${toneDesc}) for:

LEAD:
- Name: ${context.leadName}
- Role: ${context.leadPosition}
${context.leadCompany ? `- Company: ${context.leadCompany}` : ''}
- Context: ${context.leadRequirement}
${context.leadLinkedIn ? `- LinkedIn: ${context.leadLinkedIn}` : ''}
${context.leadWebsite ? `- Website: ${context.leadWebsite}` : ''}

HISTORY (Previous emails sent):
${context.previousEmails?.map((e, i) => `
Email ${i + 1} (${e.sentAt}):
Subject: ${e.subject}
Body: ${e.body}
`).join('\n') || 'None'}

User has NOT replied to the above emails. This is a follow-up.

Requirements: Max ${emailTemplates.templates.cold_email_writer.structure.body.max_words} words, no fluff, curiosity-driven CTA.`;
}

/**
 * Get industry-specific context for enhanced personalization
 * This is optional and can be used for additional context
 */
export function getIndustryContext(industry: keyof typeof emailTemplates.industry_contexts) {
    return emailTemplates.industry_contexts[industry];
}

/**
 * Validates generated email against quality checks
 */
export function validateEmail(email: GeneratedEmail): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Check word count
    const wordCount = email.body.split(/\s+/).length;
    if (wordCount > 90) {
        errors.push(`Body exceeds 90 words (${wordCount} words)`);
    }

    // Check for exclamation marks
    if (email.body.includes('!') || email.subject.includes('!')) {
        errors.push('Contains exclamation marks');
    }

    // Check for forbidden words
    const lowerBody = email.body.toLowerCase();
    const lowerSubject = email.subject.toLowerCase();
    const foundForbidden = emailTemplates.cmo_bot_context.forbidden_language.filter(
        word => lowerBody.includes(word) || lowerSubject.includes(word)
    );

    if (foundForbidden.length > 0) {
        errors.push(`Contains forbidden words: ${foundForbidden.join(', ')}`);
    }

    // Check subject length
    if (email.subject.length > 50) {
        errors.push(`Subject too long (${email.subject.length} chars)`);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Get all available tone options with descriptions
 */
export function getToneOptions() {
    return Object.entries(emailTemplates.tone_variations).map(([key, value]) => ({
        value: key as ToneType,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        description: value.description,
    }));
}

/**
 * Export the raw templates for advanced use cases
 */
export const templates = emailTemplates.templates;
