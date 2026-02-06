# OpenAI 4.1 Integration Guide

## Overview

Reply Rockets now supports **OpenAI GPT-4.1**, the latest and most advanced OpenAI model, alongside other existing models (GPT-4 Turbo, GPT-4o, GPT-4o Mini). This document explains the integration and how to use it.

## What Changed

### 1. **Backend Configuration** (`src/lib/ai/ai-provider.ts`)
- Added `OpenAIModel` type supporting 4 variants:
  - `'gpt-4.1'` (Latest, default) - State-of-the-art
  - `'gpt-4-turbo'` - Enterprise-grade performance
  - `'gpt-4o'` - Optimized multi-modal performance  
  - `'gpt-4o-mini'` - Cost-effective high performance

- Added `ModelInfo` interface with detailed specs:
  ```typescript
  interface ModelInfo {
      displayName: string;
      costPer1MTokens: string;  // Input/Output pricing
      speed: 'Very Fast' | 'Fast' | 'Medium' | 'Slow';
      quality: 'Good' | 'Very Good' | 'Excellent' | 'State-of-the-art';
      contextWindow: number;
  }
  ```

- Added `openaiModels` constant with full pricing and capability details
- Updated default OpenAI model from `gpt-4o-mini` → `gpt-4.1`

### 2. **User Preferences** (`src/lib/ai/ai-provider.ts`)
- New `getUserSelectedProvider()` function reads user settings from localStorage
- New `getConfigForUserProvider()` function retrieves configuration with user's selected model
- Preserves user's model choice across sessions via localStorage

### 3. **UI Settings Component** (`src/components/settings/AIProviderSettings.tsx`)
- Added dedicated OpenAI model selector dropdown
- Shows all 4 OpenAI model variants with:
  - Display names and version info
  - Cost per 1M tokens (input/output)
  - Speed ratings
  - Quality tiers
  - Context window sizes
- Highlights GPT-4.1 as "Latest" with visual badge
- Color-coded styling for OpenAI section
- Context window information display
- Dynamic tip text based on selected model

### 4. **Email Generation** (`src/lib/ai/email-generator.ts`)
- Updated `generateEmail()` function to use user's selected provider
- Automatically uses chosen OpenAI model if OpenAI is selected
- Falls back to 'lovable' if no provider configured
- Supports provider override via options parameter

## Model Comparison

| Feature | GPT-4.1 (Latest) | GPT-4 Turbo | GPT-4o | GPT-4o Mini |
|---------|------------------|------------|--------|-------------|
| **Cost/1M tokens** | $3 / $15 | $10 / $30 | $5 / $15 | $0.15 / $0.60 |
| **Speed** | Fast | Fast | Very Fast | Very Fast |
| **Quality** | State-of-the-art | Excellent | Excellent | Very Good |
| **Context Window** | 128K | 128K | 128K | 128K |
| **Best For** | Complex reasoning, nuanced emails | Enterprise use | Multi-modal, balanced | Budget emails |

## How to Use

### Switching to OpenAI 4.1

1. **Go to Settings** → AI Provider
2. **Select Provider**: Choose "OpenAI GPT-4.1 (Latest)"
3. **Choose Model**: 
   - For best quality: Select "GPT-4.1 (Latest)" ⭐
   - For cost-efficiency: Select "GPT-4o Mini"
   - For enterprise: Select "GPT-4 Turbo"
4. **Enter API Key**: Paste your OpenAI API key
5. **Save Settings**

### Getting OpenAI API Key

1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy and paste into Reply Rockets settings
5. Keep your key secure - never share it

## Pricing Estimation

### GPT-4.1 Cost Example
Assuming average email: ~500 tokens input, ~150 tokens output

- **Per email**: ($3 × 500 + $15 × 150) ÷ 1,000,000 = **~$0.0045** per email
- **Per 1,000 emails**: ~$4.50

### Comparison (1,000 emails)
- GPT-4.1: ~$4.50
- GPT-4 Turbo: ~$15
- GPT-4o: ~$7.50
- GPT-4o Mini: ~$0.30 (most economical)
- Lovable AI: ~$0.10 (cheapest)

## Architecture

### Data Flow
```
User Settings (localStorage)
    ↓
AIProviderSettings.tsx ← Stores provider + model choice
    ↓
generateEmail() ← Gets user preferences via getUserSelectedProvider()
    ↓
callAIProvider() ← Routes to correct provider (OpenAI/Claude/Lovable)
    ↓
Supabase Edge Function ← Handles API calls securely (OpenAI/Claude)
    ↓
AI Provider API ← Generates response
    ↓
Email Result ← Returned to application
```

### Key Functions

**`getUserSelectedProvider()`**
```typescript
// Returns user's selected provider and model
const { provider, model } = getUserSelectedProvider();
// { provider: 'openai', model: 'gpt-4.1' }
```

**`getConfigForUserProvider()`**
```typescript
// Returns full config with user's selected model
const config = getConfigForUserProvider();
// { name: 'openai', model: 'gpt-4.1', ... }
```

**`generateEmail(context, options)`**
```typescript
// Automatically uses user's selected provider
const result = await generateEmail(context);
// Uses GPT-4.1 if user selected it
```

## Edge Function Integration

The backend Edge Function (`supabase/functions/chat-completion/`) receives:
- `provider`: 'openai', 'claude', or 'lovable'
- `model`: Specific model string (e.g., 'gpt-4.1')
- `messages`: Conversation history
- `temperature`: Creativity setting
- `maxTokens`: Response length limit

The Edge Function handles:
- ✅ Secure API key management
- ✅ Request formatting per provider
- ✅ Response parsing
- ✅ Token counting
- ✅ Error handling

## Performance Characteristics

### GPT-4.1 Benefits
- **Advanced Reasoning**: Better for complex personalization logic
- **Nuanced Output**: Superior for tone and style matching
- **Contextual Understanding**: Improved multi-lead campaign reasoning
- **Instruction Following**: More reliable prompt adherence

### When to Use Each Model

**GPT-4.1** (Default)
- High-value campaigns
- Complex personalization needs
- Brand voice consistency important
- Can afford $3-15/1M token cost

**GPT-4 Turbo**
- Enterprise deployments
- Highest quality requirements
- Large batch campaigns

**GPT-4o**
- Balanced quality/cost
- Standard B2B campaigns
- Multi-variant testing

**GPT-4o Mini**
- High volume, lower quality needs
- Testing templates
- Budget-conscious operations

**Lovable (Gemini)**
- Fastest generation
- Lowest cost
- Good for A/B testing templates

## Testing Your Setup

### Verify Configuration
```typescript
// In browser console:
localStorage.getItem('ai_provider')     // Should be 'openai'
localStorage.getItem('openai_model')    // Should be 'gpt-4.1'
localStorage.getItem('openai_api_key')  // Should be set
```

### Test Email Generation
1. Go to Compose page
2. Fill in lead details
3. Click "Generate Email"
4. Verify email quality
5. Check DevTools → Network for successful API response

### Monitor Costs
- OpenAI Dashboard: [platform.openai.com/account/usage](https://platform.openai.com/account/usage)
- Filter by project/API key used
- Track token usage and costs

## Troubleshooting

### Issue: "API Key not configured"
**Solution**: 
- Check Settings → AI Provider
- Ensure OpenAI is selected
- Verify API key is entered and saved
- Check that API key is valid on [platform.openai.com](https://platform.openai.com)

### Issue: "Model not available"
**Solution**:
- Ensure your OpenAI account has GPT-4.1 access
- Check account billing is current
- Verify API key has required permissions

### Issue: Slow email generation
**Solution**:
- GPT-4.1 may be slower than GPT-4o-mini
- Try reducing batch size
- Consider using GPT-4o for faster generation

### Issue: High costs
**Solution**:
- Switch to GPT-4o-mini for better cost efficiency
- Reduce context in prompts
- Use Lovable AI for testing
- Check Edge Function isn't making duplicate calls

## Monitoring & Analytics

### Key Metrics to Track
- **Average cost per email**: Track in AnalyticsPage
- **Generation time**: Monitor response latency
- **Success rate**: Check error logs
- **Quality feedback**: User ratings on generated emails

### Cost Optimization Tips
1. Start with GPT-4o for testing
2. Switch to 4.1 for production campaigns
3. Use 4o-mini for high-volume templating
4. Monitor Edge Function logs for errors
5. Cache successful email templates

## Future Improvements

Planned enhancements:
- [ ] Model cost calculator in UI
- [ ] A/B testing between models
- [ ] Automatic model selection based on campaign type
- [ ] Batch processing with model selection
- [ ] Token usage analytics dashboard
- [ ] Prompt caching for repeated sequences

## Related Documentation

- [AI Provider Configuration](./docs/AI_EMAIL_SYSTEM.md)
- [Email System Architecture](./docs/AI_EMAIL_SYSTEM.md#system-architecture)
- [Prompt Framework](./docs/CMO_BOT_PROMPT_FRAMEWORK.md)
- [Personalization System](./docs/RESEARCH_BASED_PERSONALIZATION.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Edge Function logs in Supabase dashboard
3. Verify OpenAI API status at [status.openai.com](https://status.openai.com)
4. Check Reply Rockets issue tracker

---

**Last Updated**: February 2026  
**Supported Models**: GPT-4.1, GPT-4 Turbo, GPT-4o, GPT-4o Mini  
**Status**: ✅ Production Ready
