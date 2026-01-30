# Quick Reference: Updating Email Templates

## Common Tasks

### Adding a Forbidden Word

**File**: `src/lib/prompts/email-templates.json`

```json
{
  "templates": {
    "cmo_bot_context": {
      "forbidden_words": [
        "synergy",
        "leverage",
        "YOUR_NEW_WORD_HERE"  // ← Add here
      ]
    }
  }
}
```

### Adding a New CTA Example

```json
{
  "templates": {
    "cold_email_writer": {
      "structure": {
        "cta": {
          "examples": [
            "Worth a quick chat?",
            "Curious if this resonates?",
            "YOUR_NEW_CTA_HERE"  // ← Add here
          ]
        }
      }
    }
  }
}
```

### Adding a New Tone

```json
{
  "templates": {
    "tone_variations": {
      "your_new_tone": {  // ← Add new tone
        "description": "Description of the tone",
        "characteristics": "Key characteristics"
      }
    }
  }
}
```

**Also update**: `src/lib/prompts/prompt-manager.ts`
```typescript
export type ToneType = 'professional' | 'casual' | 'friendly' | 'direct' | 'your_new_tone';
```

### Adding a New Industry

```json
{
  "templates": {
    "industry_specific_contexts": {
      "your_industry": {  // ← Add new industry
        "pain_points": [
          "Pain point 1",
          "Pain point 2"
        ],
        "value_drivers": [
          "Value driver 1",
          "Value driver 2"
        ]
      }
    }
  }
}
```

### Changing Word Limit

```json
{
  "templates": {
    "cold_email_writer": {
      "structure": {
        "body": {
          "max_words": 90  // ← Change this number
        }
      }
    }
  }
}
```

**Also update validation** in `src/lib/prompts/prompt-manager.ts`:
```typescript
if (wordCount > 90) {  // ← Update this number too
  errors.push(`Body exceeds 90 words (${wordCount} words)`);
}
```

### Changing Subject Line Length

```json
{
  "templates": {
    "cold_email_writer": {
      "structure": {
        "subject_line": {
          "max_chars": 50  // ← Change this number
        }
      }
    }
  }
}
```

## Template Structure Reference

```
email-templates.json
├── cmo_bot_context
│   ├── role                    (AI's role description)
│   ├── expertise               (Areas of expertise)
│   ├── writing_principles      (Core writing guidelines)
│   ├── forbidden_words         (Words to avoid)
│   └── forbidden_patterns      (Patterns to avoid)
│
├── cold_email_writer
│   ├── framework               (Email framework used)
│   ├── structure
│   │   ├── subject_line        (Subject line rules)
│   │   ├── opening             (Opening paragraph rules)
│   │   ├── body                (Body structure)
│   │   └── cta                 (Call-to-action guidelines)
│   ├── personalization_variables
│   └── quality_checks
│
├── tone_variations             (Different tone profiles)
│   ├── professional
│   ├── casual
│   ├── friendly
│   └── direct
│
└── industry_specific_contexts  (Industry-specific data)
    ├── saas
    ├── ecommerce
    └── agency
```

## Testing Your Changes

### 1. Validate JSON Syntax

Use an online JSON validator or:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('src/lib/prompts/email-templates.json')))"
```

### 2. Test Email Generation

```typescript
// In your browser console or test file
import { generateEmail } from '@/lib/ai/email-generator';

const testContext = {
  leadName: "John Doe",
  leadPosition: "CEO",
  leadRequirement: "Looking to improve email outreach",
  tone: 'professional',
  companyInfo: {
    companyName: "Test Company",
    description: "We help with email outreach"
  }
};

const result = await generateEmail(testContext, {
  provider: 'lovable',
  validateOutput: true
});

console.log('Subject:', result.email.subject);
console.log('Body:', result.email.body);
console.log('Validation:', result.validation);
```

### 3. Check Validation

After generating an email, check if it passes validation:
```typescript
if (!result.validation?.isValid) {
  console.log('Validation errors:', result.validation?.errors);
}
```

## Common Patterns

### Refining Based on Results

**Track what works**:
1. Save successful email examples
2. Identify common patterns
3. Add to templates

**Example workflow**:
```
1. Email gets 50% response rate
2. Analyze what made it work
3. Add CTA to examples
4. Add any unique phrases to guidelines
5. Update industry context if relevant
```

### A/B Testing Tones

```typescript
const tones = ['professional', 'casual', 'friendly'];
const results = [];

for (const tone of tones) {
  const result = await generateEmail({ ...context, tone });
  results.push({ tone, email: result.email });
}

// Compare and update templates based on performance
```

## Best Practices

1. **Make Small Changes**: Test one change at a time
2. **Keep Backups**: Save a copy before major edits
3. **Document Changes**: Add comments explaining why you made changes
4. **Test Thoroughly**: Generate multiple emails after changes
5. **Monitor Results**: Track performance before and after template updates

## Rollback

If you need to revert changes:

```bash
# Using git
git checkout src/lib/prompts/email-templates.json

# Or restore from backup
cp email-templates.json.backup src/lib/prompts/email-templates.json
```

## Getting Help

- Review `docs/AI_EMAIL_SYSTEM.md` for full documentation
- Check validation errors for specific issues
- Test with different providers to isolate problems
- Use `estimateCost()` to check token usage after changes
