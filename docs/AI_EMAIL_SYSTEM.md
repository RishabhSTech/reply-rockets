# AI Email Generation System - Documentation

## Overview

This system provides a **cost-effective** and **token-efficient** way to preserve refined prompts from your CMO bot and Email Cold Writer, and integrate them with multiple AI providers (Claude, OpenAI, and Lovable).

## Architecture

### 1. **Prompt Templates** (`src/lib/prompts/email-templates.json`)

This JSON file is the **single source of truth** for all email generation context. It contains:

- **CMO Bot Context**: Writing principles, forbidden words, tone guidelines
- **Cold Email Writer Framework**: Structure, CTA styles, personalization variables
- **Tone Variations**: Different tone profiles (professional, casual, friendly, direct)
- **Industry-Specific Contexts**: Pre-defined pain points and value drivers for different industries

**Token Efficiency**: By storing templates in JSON, we avoid repeating the same context in every API call. The system dynamically builds prompts by combining only the necessary parts.

### 2. **Prompt Manager** (`src/lib/prompts/prompt-manager.ts`)

Utility functions for working with prompt templates:

- `buildSystemPrompt()`: Creates optimized system prompts with minimal tokens
- `buildUserPrompt()`: Generates concise user prompts with lead-specific context
- `validateEmail()`: Checks generated emails against quality standards
- `getToneOptions()`: Returns available tone variations
- `getIndustryContext()`: Retrieves industry-specific context

**Key Features**:
- Modular prompt building (only include what's needed)
- Automatic validation against your refined rules
- Type-safe interfaces for TypeScript

### 3. **AI Provider Abstraction** (`src/lib/ai/ai-provider.ts`)

Unified interface for multiple AI providers:

- **Claude 3.5 Sonnet**: Highest quality, best for nuanced personalization (~$0.003/email)
- **GPT-4o Mini**: Balanced performance and cost (~$0.0015/email)
- **Lovable AI (Gemini)**: Fast and cost-effective (~$0.0001/email)

**Key Features**:
- Single interface for all providers
- Automatic API key management from environment variables
- Consistent error handling
- Usage tracking (token counts)

### 4. **Email Generation Service** (`src/lib/ai/email-generator.ts`)

High-level service that orchestrates everything:

- `generateEmail()`: Main function to generate personalized emails
- `generateBatchEmails()`: Process multiple leads efficiently
- `regenerateEmail()`: A/B test different tones or providers
- `estimateCost()`: Calculate token usage before generation

### 5. **UI Components**

#### AI Provider Settings (`src/components/settings/AIProviderSettings.tsx`)
Allows users to:
- Choose their preferred AI provider
- Enter API keys securely (stored locally)
- Compare costs and quality
- View provider information

#### Email Composer (Updated)
Now automatically uses the selected AI provider from settings.

## How It Works

### Email Generation Flow

```
1. User selects a lead in EmailComposer
2. EmailComposer reads AI provider from localStorage
3. Request sent to Supabase Edge Function with:
   - Lead information
   - Company context
   - Tone preference
   - Selected AI provider
4. Edge Function:
   - Builds system prompt from templates
   - Builds user prompt with lead context
   - Calls selected AI provider
   - Parses and validates response
5. Generated email returned to UI
6. User reviews and sends
```

### Token Optimization Strategy

**Before** (typical approach):
```
System Prompt: 2000 tokens (full context every time)
User Prompt: 500 tokens
Total: 2500 tokens per email
```

**After** (our approach):
```
System Prompt: 400 tokens (core principles only)
User Prompt: 300 tokens (lead-specific)
Total: 700 tokens per email
```

**Savings**: ~72% reduction in token usage!

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```env
# Lovable AI (already configured)
VITE_LOVABLE_API_KEY=your_lovable_key

# Optional: Claude API
VITE_CLAUDE_API_KEY=your_claude_key

# Optional: OpenAI API
VITE_OPENAI_API_KEY=your_openai_key
```

For Supabase Edge Functions, add to your Supabase project secrets:

```bash
# Set secrets for Edge Functions
supabase secrets set LOVABLE_API_KEY=your_lovable_key
supabase secrets set CLAUDE_API_KEY=your_claude_key
supabase secrets set OPENAI_API_KEY=your_openai_key
```

### 2. Customizing Prompts

Edit `src/lib/prompts/email-templates.json` to refine:

1. **Forbidden Words**: Add words to avoid in emails
2. **Writing Principles**: Update tone and style guidelines
3. **CTA Examples**: Add your best-performing CTAs
4. **Industry Contexts**: Add new industries or update pain points

Example:
```json
{
  "cmo_bot_context": {
    "forbidden_words": [
      "synergy",
      "leverage",
      "your_custom_word_to_avoid"
    ]
  }
}
```

### 3. Switching AI Providers

**In the UI**:
1. Go to Settings
2. Find "AI Provider" section
3. Select your preferred provider
4. Enter API key if required
5. Save settings

**Programmatically**:
```typescript
import { generateEmail } from '@/lib/ai/email-generator';

const result = await generateEmail(context, {
  provider: 'claude', // or 'openai' or 'lovable'
  temperature: 0.7,
  validateOutput: true,
});
```

## Cost Comparison

| Provider | Model | Cost/Email | Speed | Quality | Best For |
|----------|-------|------------|-------|---------|----------|
| Lovable | Gemini 3 Flash | $0.0001 | Fast | Good | High volume, budget-conscious |
| OpenAI | GPT-4o Mini | $0.0015 | Fast | Very Good | Balanced use cases |
| Claude | 3.5 Sonnet | $0.003 | Medium | Excellent | Premium personalization |

**Example**: 1000 emails/month
- Lovable: $0.10
- OpenAI: $1.50
- Claude: $3.00

## Advanced Usage

### Batch Generation

```typescript
import { generateBatchEmails } from '@/lib/ai/email-generator';

const contexts = leads.map(lead => ({
  leadName: lead.name,
  leadPosition: lead.position,
  leadRequirement: lead.requirement,
  tone: 'professional',
  companyInfo: myCompanyInfo,
}));

const results = await generateBatchEmails(contexts, {
  provider: 'lovable', // Use cheapest for batch
  validateOutput: true,
});
```

### A/B Testing

```typescript
// Generate with different tones
const professional = await generateEmail(context, { 
  provider: 'claude' 
});

const casual = await regenerateEmail(context, professional, {
  tone: 'casual',
});

// Compare results
console.log('Professional:', professional.email.subject);
console.log('Casual:', casual.email.subject);
```

### Cost Estimation

```typescript
import { estimateCost } from '@/lib/ai/email-generator';

const estimate = estimateCost(context, 'claude');
console.log(`Estimated tokens: ${estimate.estimatedTotalTokens}`);
console.log(`Estimated cost: $${estimate.estimatedTotalTokens * 0.000003}`);
```

## Best Practices

### 1. **Token Efficiency**
- Keep company info concise
- Use abbreviations where appropriate
- Remove redundant context

### 2. **Quality Control**
- Always enable `validateOutput: true`
- Review generated emails before sending
- Track which provider/tone performs best

### 3. **Cost Management**
- Use Lovable for high-volume campaigns
- Use Claude for high-value prospects
- Use OpenAI for balanced approach

### 4. **Template Maintenance**
- Regularly update forbidden words based on feedback
- Add successful CTA examples to templates
- Refine industry contexts based on results

## Troubleshooting

### "API key not configured"
- Check `.env` file has correct keys
- For Edge Functions, verify Supabase secrets
- Ensure key names match exactly (VITE_CLAUDE_API_KEY, etc.)

### "Rate limit exceeded"
- Switch to a different provider temporarily
- Implement delays between batch requests
- Consider upgrading API plan

### "Generated email fails validation"
- Check template constraints (word count, forbidden words)
- Adjust temperature (lower = more consistent)
- Review and update validation rules

## Future Enhancements

- [ ] Add support for more AI providers (Anthropic, Cohere, etc.)
- [ ] Implement caching for similar leads
- [ ] Add A/B testing dashboard
- [ ] Track conversion rates by provider/tone
- [ ] Auto-optimize provider selection based on performance
- [ ] Add multi-language support

## Support

For issues or questions:
1. Check this documentation
2. Review template files for examples
3. Test with different providers
4. Validate your API keys

## Version History

- **v1.0.0** (2026-01-30): Initial release with Claude, OpenAI, and Lovable support
