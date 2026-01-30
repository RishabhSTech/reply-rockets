# Deployment Checklist

## Step 1: Database Migration
```bash
# Run the migration to add new columns and tables
supabase db push

# Verify migration was applied
supabase db list
```

Expected changes:
- `leads` table: Add `persona_insights` (JSONB) and `persona_generated_at` (TIMESTAMP)
- `campaigns` table: Add `emails_sent`, `last_run_at`, `prompt_json`
- New `sequences` table created
- `email_logs` table: Add `sequence_id` column

## Step 2: Deploy Edge Functions
```bash
# Deploy generate-persona function
supabase functions deploy generate-persona

# Deploy send-campaign-emails function
supabase functions deploy send-campaign-emails

# Verify deployment
supabase functions list
```

## Step 3: Update Environment Variables (if needed)
If using OpenAI or Claude:
```bash
# Set in Supabase secrets
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set CLAUDE_API_KEY=your_key
```

## Step 4: Test the Features
1. **Test Lead Persona Generation**
   - Go to Leads page
   - Add new lead WITH LinkedIn URL or website
   - Wait 2-5 seconds
   - Click the lead → Persona tab
   - Should see generated persona

2. **Test Email Preview**
   - Go to lead detail page
   - Click "Email Preview" tab
   - Select different tones
   - Click "Generate"
   - Preview should appear

3. **Test Campaign Run Now**
   - Create a campaign with leads
   - Click "Run Now" button
   - Should see sending indicator
   - Check campaign stats updated

## Step 5: Verify Changes
```bash
# Check migrations applied
supabase migration list

# Check functions deployed
supabase functions list

# View function logs
supabase functions logs generate-persona
supabase functions logs send-campaign-emails
```

## Code Changes Summary

### New Files
- `src/pages/LeadDetailPage.tsx` (495 lines)
- `supabase/functions/generate-persona/index.ts` (178 lines)
- `supabase/functions/send-campaign-emails/index.ts` (126 lines)
- `supabase/migrations/20260131_add_lead_persona.sql` (51 lines)

### Modified Files
- `src/App.tsx` - Added import and route
- `src/components/leads/LeadForm.tsx` - Background persona generation (42 new lines)
- `src/pages/CampaignsPage.tsx` - Run Now feature (53 new lines)
- `src/components/leads/LeadsList.tsx` - Made clickable, import router
- `src/components/composer/EmailComposer.tsx` - Provider API key validation
- `src/components/settings/AIProviderSettings.tsx` - Updated copy

## Rollback Procedure
If something goes wrong:

```bash
# Rollback migration
supabase db reset

# Remove functions
supabase functions delete generate-persona
supabase functions delete send-campaign-emails

# Revert code changes via git
git revert <commit-hash>
```

## Monitoring

Watch for errors in:
```bash
# Function logs
supabase functions logs generate-persona --limit 50
supabase functions logs send-campaign-emails --limit 50

# Database logs
supabase logs

# Check error_logs table
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10;
```

## Performance Notes

- Persona generation: ~3-5 seconds per lead (background)
- Email generation: ~1-2 seconds per lead
- Campaign send: ~1-2s per lead + API time
- Database queries: <100ms for most operations
- Caching: Personas cached forever (only recompute if deleted)

## Cost Optimization Verification

✅ Personas stored once - reused forever
✅ No duplicate API calls for same lead
✅ Campaign sends use stored personas
✅ Batch processing of emails
✅ Provider selection working correctly

## Success Indicators

- ✅ Leads with LinkedIn get persona generated
- ✅ Email preview works for all tones
- ✅ Campaign "Run Now" sends emails
- ✅ Campaign stats update
- ✅ No duplicate AI calls
- ✅ All pages load without errors
