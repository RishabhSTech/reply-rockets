# Technical Architecture - Lead Persona & Campaign System

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
├─────────────────────────────────────────────────────────────┤
│  • LeadForm → Adds lead (triggers background persona)       │
│  • LeadsList → Shows leads (clickable to detail page)       │
│  • LeadDetailPage → Persona + Email preview                 │
│  • CampaignsPage → Run Now feature for bulk sending         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                   │
├─────────────────────────────────────────────────────────────┤
│  1. generate-persona                                         │
│     - Input: LinkedIn/website                               │
│     - Output: Persona JSON                                  │
│     - Providers: OpenAI, Claude, Lovable                    │
│                                                              │
│  2. generate-email (existing, enhanced)                     │
│     - Input: Lead + persona                                 │
│     - Output: Subject + body                                │
│     - Uses stored personas for context                      │
│                                                              │
│  3. send-campaign-emails (new)                              │
│     - Input: Campaign ID                                    │
│     - Process: For each lead:                               │
│        a) Call generate-email                               │
│        b) Call send-email                                   │
│        c) Log result                                        │
│     - Output: Results array                                 │
│                                                              │
│  4. send-email (existing, used by campaign)                 │
│     - Input: Email details                                  │
│     - Output: Sent status                                   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
├─────────────────────────────────────────────────────────────┤
│  leads                                                       │
│  ├─ id, name, position, requirement                         │
│  ├─ founder_linkedin, website_url, email                    │
│  ├─ NEW: persona_insights (JSONB)                           │
│  └─ NEW: persona_generated_at (TIMESTAMP)                   │
│                                                              │
│  campaigns                                                   │
│  ├─ id, name, status, user_id                               │
│  ├─ NEW: emails_sent (count)                                │
│  ├─ NEW: last_run_at (timestamp)                            │
│  └─ NEW: prompt_json (campaign context)                     │
│                                                              │
│  email_logs                                                  │
│  ├─ existing fields                                         │
│  └─ NEW: sequence_id (link to sequence)                     │
│                                                              │
│  NEW: sequences                                              │
│  ├─ id, campaign_id, name                                   │
│  └─ prompt_config (JSONB)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Lead Addition with Persona Generation
```
User adds lead with LinkedIn
        ↓
LeadForm validates input
        ↓
Lead inserted in DB
        ↓
generate-persona edge function invoked (background)
        ↓
AI generates persona from LinkedIn/website
        ↓
Persona stored in leads.persona_insights
        ↓
UI shows persona in 2-5 seconds
```

### 2. Email Preview Generation
```
User clicks "Generate Email" in preview tab
        ↓
Tone selected
        ↓
generate-email edge function called
        ↓
AI uses stored persona + tone + company info
        ↓
Email content generated
        ↓
UI displays subject + body preview
        ↓
User can modify or accept
```

### 3. Campaign Bulk Send
```
User clicks "Run Now" on campaign
        ↓
send-campaign-emails function invoked
        ↓
Fetch all leads in campaign
        ↓
For each lead:
  ├─ Use stored persona (or generate if missing)
  ├─ Call generate-email with personalization
  ├─ Call send-email to SMTP
  └─ Log result
        ↓
Update campaign.emails_sent
        ↓
Update campaign.last_run_at
        ↓
Return results array to UI
```

## Cost Optimization Strategy

### 1. Persona Generation
**Cost: ~$0.001-$0.003 per persona**

- Generated once per lead (reused forever)
- Triggered automatically on lead creation
- Stored in database (persona_insights column)
- Only regenerates if user clicks "Generate" button

Example: 1000 leads
- Initial cost: $1-$3 (one time)
- Subsequent uses: $0 (stored data)

### 2. Email Generation
**Cost: ~$0.0001-$0.001 per email**

- Uses stored personas (no regeneration)
- Batched requests for campaigns
- Single API call per email generation

Example: 1000 emails from stored personas
- Cost: $0.10-$1.00 (reusing personas)
- vs. $1-$3 if regenerating personas each time

### 3. Provider Selection
```
Lovable (Gemini Flash):     $0.0001/email  - Bulk campaigns
OpenAI (GPT-4o Mini):       $0.001/email   - Quality needs
Claude (3.5 Sonnet):        $0.003/email   - Premium quality
```

**Total for 1000 lead outreach:**
- Personas: $1-$3 (one time)
- Emails: $0.10-$3.00 (depending on provider)
- **Total: $1.10-$6.00**

## API Response Structures

### generate-persona Response
```json
{
  "persona": {
    "title": "VP of Sales at B2B SaaS",
    "industry": "SaaS/Enterprise Software",
    "painPoints": [
      "Hiring and retaining top SDRs",
      "Low response rates on outreach",
      "Manual sequence management"
    ],
    "priorities": [
      "Scaling sales team efficiently",
      "Improving lead quality",
      "Reducing manual work"
    ],
    "icebreakerHooks": [
      "Recent Series B funding announcement",
      "Expansion into EU market",
      "New VP hire on LinkedIn"
    ],
    "openingLines": [
      "Noticed you recently hired 3 new sales reps...",
      "Saw you closed Series B - congrats on scaling...",
      "Your product docs mention EU expansion..."
    ],
    "companyContext": "Fast-growing B2B SaaS with focus on sales efficiency",
    "keyTakeaways": "High performer focused on efficiency and team growth"
  }
}
```

### send-campaign-emails Response
```json
{
  "success": true,
  "emailsSent": 45,
  "total": 50,
  "results": [
    {
      "success": true,
      "leadId": "lead-1",
      "email": "john@example.com"
    },
    {
      "success": false,
      "leadId": "lead-2",
      "error": "Invalid email"
    }
  ]
}
```

## Error Handling

### Missing API Key
```
provider = "openai" but no OPENAI_API_KEY
        ↓
Function checks environment
        ↓
Throws error: "OpenAI API key not configured"
        ↓
UI shows toast: "Missing API key - add in Settings"
```

### Missing Required Data
```
Lead without LinkedIn or website when generating persona
        ↓
Function validates input
        ↓
Throws error: "Either founderLinkedIn or websiteUrl is required"
        ↓
UI shows error message
```

### Batch Campaign Send Failure
```
Campaign has 50 leads, 3 fail
        ↓
Function logs failures in results array
        ↓
Returns success with partial results:
{
  "emailsSent": 47,
  "total": 50,
  "results": [ ... including failures ... ]
}
        ↓
UI shows: "Sent 47/50 emails" + error details
```

## Performance Benchmarks

| Operation | Time | Cost |
|-----------|------|------|
| Generate persona | 3-5s | $0.001-$0.003 |
| Generate email | 1-2s | $0.0001-$0.001 |
| Send email via SMTP | 100-500ms | $0 |
| Campaign send (10 leads) | 15-25s | $0.001-$0.03 |
| Load lead details page | 200-400ms | $0 |
| Database persona lookup | 10-50ms | $0 |

## Database Query Optimization

### Fetching Lead with Persona
```sql
SELECT id, name, position, persona_insights 
FROM leads 
WHERE id = ? AND user_id = ?
-- Index on (id, user_id)
-- persona_insights: can be large but rarely updated
```

### Campaign with Lead Stats
```sql
SELECT c.*, COUNT(el.id) as sent_count
FROM campaigns c
LEFT JOIN email_logs el ON c.id = el.campaign_id
WHERE c.user_id = ?
GROUP BY c.id
-- Index on campaigns(user_id, created_at)
```

### Fetching Persona Only
```sql
SELECT persona_insights FROM leads WHERE id = ?
-- Optimized: only fetch JSONB, not entire row
```

## Security Considerations

### API Keys
- ✅ Stored in browser localStorage (encrypted in production)
- ✅ Never logged or exposed in console
- ✅ Validated before sending to API
- ✅ Can be rotated in Settings

### User Data
- ✅ RLS policies on all tables
- ✅ Users can only access their own data
- ✅ Lead data isolated by user_id
- ✅ Campaign data isolated by user_id

### AI Output
- ✅ No sensitive data passed to AI
- ✅ Only name, position, URL provided
- ✅ Persona never exposed publicly
- ✅ Email preview shown to user before send

## Future Enhancements

1. **Sequence Workflows** - Multi-step sequences per campaign
2. **A/B Testing** - Auto-generate multiple tones, track performance
3. **Persona Caching** - Pre-cache personas for bulk adds
4. **Scheduled Campaigns** - Set time/frequency for send
5. **Analytics** - Track which personas generate best responses
6. **Feedback Loop** - Rate persona accuracy, refine AI
7. **Batch Persona Gen** - Generate 100 personas async
8. **Custom Prompts** - Store custom persona templates
