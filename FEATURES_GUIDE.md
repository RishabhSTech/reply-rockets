# Lead Persona & Campaign Features - Implementation Guide

## Overview
You now have a complete system for generating lead personas, previewing personalized emails, and running campaigns in bulk. All AI calls are optimized for cost-effectiveness.

## Features Implemented

### 1. **Lead Persona Generation**
When adding a new lead with a LinkedIn profile or website, the system automatically generates a comprehensive persona in the background.

**What it generates:**
- Professional title and industry context
- Pain points specific to their role
- Business priorities
- Research-based icebreaker hooks
- Cold email opening lines
- Key insights for personalization

**Where to find it:** Click on any lead → "Persona" tab

**Cost optimization:** 
- Uses background processing (non-blocking)
- Stored in database so you never regenerate for same lead
- Works with your selected AI provider

### 2. **Lead Detail Page**
Every lead now has a dedicated page with three tabs:

**Tab 1: Overview**
- All lead information
- Links to LinkedIn and website
- Challenge/requirement details

**Tab 2: Persona** 
- Displays AI-generated professional insights
- Shows pain points, priorities, and icebreaker hooks
- "Generate" button to create or refresh persona
- Only visible if LinkedIn or website provided

**Tab 3: Email Preview**
- Real-time email generation for the specific lead
- Choose tone (professional, casual, friendly, direct)
- See exactly what gets sent before campaign
- Test different approaches

**How to access:** Click any lead in the leads list

### 3. **Campaign "Run Now" Feature**
Send personalized emails to all leads in a campaign instantly.

**What happens:**
1. Click "Run Now" on any campaign
2. System fetches all leads assigned to campaign
3. Generates personalized email for each lead using:
   - Their persona data
   - Campaign-specific context
   - Selected tone
   - Your company info
4. Sends all emails through your SMTP
5. Updates campaign stats automatically

**Cost optimization:**
- Reuses stored personas (no regeneration)
- Batches API calls efficiently
- Single generation + send flow

### 4. **Database Migrations**
New tables and columns added:

```sql
-- New columns on leads table
- persona_insights JSONB        # Stores AI-generated persona
- persona_generated_at         # Timestamp of generation

-- New sequences table
- For managing email sequences
- Stores prompt configs per campaign
- Tracks which sequence generated an email

-- Updated campaigns table
- emails_sent INTEGER           # Track volume
- last_run_at TIMESTAMP         # Last campaign execution
- prompt_json JSONB             # Campaign-specific context
```

### 5. **Cost Optimization Strategies**

**Storage-based:**
- Personas stored once, reused forever
- No regenerating insights for same lead
- Company info cached in database

**Request Minimization:**
- Background persona generation (doesn't block user)
- Batch email generation for campaigns
- Reuse of stored persona data in emails

**Provider Flexibility:**
- Use cheapest provider (Lovable) by default
- Or switch to premium (Claude/OpenAI) for quality
- API keys validated before sending

**Smart Caching:**
- Lead personas cached in `persona_insights`
- Company context fetched once per session
- Sequence configs stored per campaign

## How to Use

### Adding a Lead
1. Go to Leads page
2. Fill out the form
3. **Provide LinkedIn or website** (triggers background persona generation)
4. Click "Save Lead"
5. Lead will appear with persona within seconds

### Viewing Lead Details
1. Click any lead in the list
2. You'll see three tabs:
   - **Overview**: Basic info
   - **Persona**: Generated insights (if available)
   - **Email Preview**: Test email generation

### Previewing Emails
1. Go to lead detail page
2. Click "Email Preview" tab
3. Select a tone
4. Click "Generate"
5. See exactly what will be sent

### Running a Campaign
1. Go to Campaigns page
2. Click "Run Now" on any campaign
3. System sends personalized emails to all leads
4. See results in real-time
5. Stats update automatically

### Optimizing for Cost
- Use Lovable for bulk campaigns (cheapest)
- Use Claude/OpenAI only for important prospects
- Leverage stored personas (no extra cost)
- Review email previews before sending

## API Endpoints

### Generate Persona
```
POST /functions/v1/generate-persona
Body: {
  leadName: string
  leadPosition: string
  founderLinkedIn?: string      # Optional
  websiteUrl?: string           # Optional (one required)
  provider?: 'openai'|'claude'|'lovable'
  providerApiKey?: string
}
```

### Send Campaign Emails
```
POST /functions/v1/send-campaign-emails
Body: {
  campaignId: string
  provider?: 'openai'|'claude'|'lovable'
  providerApiKey?: string
}
```

## Database Schema Changes

Run the migration:
```bash
supabase db push  # For local
# Or apply to production
```

Migration file: `supabase/migrations/20260131_add_lead_persona.sql`

## Files Modified/Created

### New Files
- `src/pages/LeadDetailPage.tsx` - Lead detail page with persona & preview
- `supabase/functions/generate-persona/index.ts` - Persona generation
- `supabase/functions/send-campaign-emails/index.ts` - Bulk campaign sending
- `supabase/migrations/20260131_add_lead_persona.sql` - Database schema

### Modified Files
- `src/App.tsx` - Added routing for lead detail page
- `src/components/leads/LeadForm.tsx` - Auto-generate persona on lead creation
- `src/pages/CampaignsPage.tsx` - Added "Run Now" feature
- `src/components/leads/LeadsList.tsx` - Made leads clickable
- `src/components/composer/EmailComposer.tsx` - Provider API key validation
- `src/components/settings/AIProviderSettings.tsx` - Updated copy
- `supabase/functions/generate-email/index.ts` - Provider API key support

## Next Steps

1. **Deploy migrations** 
   ```bash
   supabase db push
   ```

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy generate-persona
   supabase functions deploy send-campaign-emails
   ```

3. **Test the flow**
   - Add a new lead with LinkedIn
   - Wait 2-5 seconds for persona generation
   - Click lead → Persona tab (should show insights)
   - Click "Email Preview" and try different tones
   - Create a campaign with leads
   - Click "Run Now" to send emails

## Key Benefits

✅ **Automatic Persona Generation** - Insights created when lead added  
✅ **Email Previews** - Test before sending to entire campaign  
✅ **Bulk Sending** - Send to all campaign leads with one click  
✅ **Cost Optimized** - Reuses stored data, minimal API calls  
✅ **Multi-Provider** - Works with Lovable, OpenAI, Claude  
✅ **Smart Caching** - No regeneration of same data  
✅ **Background Processing** - Non-blocking persona generation  
✅ **Campaign Stats** - Automatic tracking of sends/opens/replies
