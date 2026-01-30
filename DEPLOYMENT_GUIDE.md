# Deployment Guide - Persona & Campaign System

## ⚠️ IMPORTANT: Why "Failed to Create Persona"?

The error "failed to create persona" occurs because the system needs to be deployed before it can work. There are 3 critical components:

1. **Database Migrations** - Schema changes (persona columns) don't exist yet
2. **Edge Functions** - `generate-persona` and `send-campaign-emails` functions not deployed
3. **Configuration** - Functions need to be registered in `config.toml`

---

## Step 1: Add Functions to Config ✅

**Status**: Already completed - updated `supabase/config.toml` with:
```toml
[functions.generate-persona]
verify_jwt = false

[functions.send-campaign-emails]
verify_jwt = false
```

---

## Step 2: Deploy Database Migrations

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

2. **Link your project** (if not already linked):
```bash
cd c:\Users\risha\Desktop\reply-rockets
supabase link --project-ref kzxqeagnrlhyvijylkxp
```

3. **Push migrations to production**:
```bash
supabase db push
```

**What this does**:
- Adds `persona_insights` and `persona_generated_at` columns to leads table
- Creates new `sequences` table for email sequences
- Adds `emails_sent`, `last_run_at`, `prompt_json` to campaigns table
- Adds `sequence_id` to email_logs table
- Sets up all RLS policies and triggers

### Option B: Using Supabase Dashboard (if CLI doesn't work)

1. Go to https://app.supabase.com
2. Log in and select project `kzxqeagnrlhyvijylkxp`
3. Navigate to **SQL Editor**
4. Copy the entire contents of `supabase/migrations/20260131_add_lead_persona.sql`
5. Paste and run the SQL

**Verify success**: 
- Check **Database** → **Tables** → `leads` table
- Verify `persona_insights` column exists (type: JSONB)
- Verify `persona_generated_at` column exists (type: TIMESTAMP)

---

## Step 3: Deploy Edge Functions

### Option A: Using Supabase CLI (Recommended)

```bash
# Deploy both functions
supabase functions deploy generate-persona
supabase functions deploy send-campaign-emails

# Or deploy all functions at once
supabase functions deploy
```

**What this does**:
- Uploads `generate-persona` function to Supabase
- Uploads `send-campaign-emails` function to Supabase
- Makes them callable from your React app

### Option B: Using Supabase Dashboard

1. Go to https://app.supabase.com
2. Project `kzxqeagnrlhyvijylkxp` → **Edge Functions**
3. Click **Create a new function** for each:
   - Name: `generate-persona`
   - Name: `send-campaign-emails`
4. Copy the code from:
   - `supabase/functions/generate-persona/index.ts`
   - `supabase/functions/send-campaign-emails/index.ts`
5. Paste and deploy

---

## Step 4: Verify Deployment

### 1. Check Edge Functions are Active
```bash
supabase functions list
```

Should show:
```
✓ generate-persona
✓ send-campaign-emails
✓ send-email
✓ generate-email
```

### 2. Test in your app

1. Open your app at `http://localhost:5173` (or your deployment URL)
2. Go to **Leads** section
3. Add a new lead with:
   - **Name**: John Smith
   - **Position**: VP of Sales
   - **LinkedIn**: https://linkedin.com/in/example
   - **Company**: Tech Corp
4. Submit the form
5. **Wait 2-5 seconds** - you should see a toast notification:
   - ✅ "Persona generated successfully!" - SUCCESS
   - ❌ "Persona generation failed: ..." - NEEDS DEBUGGING

### 3. Verify Persona Generated

1. Click on the lead you just created
2. Go to **Persona** tab
3. You should see:
   - Professional title
   - Pain points (3 items)
   - Priorities (3 items)
   - Icebreaker hooks (3 items)
   - Opening lines (3 items)

---

## Troubleshooting

### "Function not found" error
**Solution**: Functions not deployed yet. Run `supabase functions deploy generate-persona`

### "No content in OpenAI response" error
**Solution**: OpenAI API key issue. Check:
1. Settings → AI Providers → OpenAI
2. Verify API key is valid
3. Verify API key has access to `gpt-4o-mini` model
4. Check OpenAI account has credits

### "Claude API key not configured" error
**Solution**: Claude key not set or expired. Check Settings → AI Providers → Claude

### Persona doesn't appear in Lead Detail Page
**Solution**: Database migration not applied yet. Run `supabase db push`

### Toast notifications not showing but persona appears to generate
**Solution**: Persona might be generating as fallback. Check:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab → supabase functions calls

---

## Complete Deployment Checklist

- [ ] Step 1: Functions added to `config.toml` ✅ (Done)
- [ ] Step 2A: Run `supabase db push` OR Step 2B: Run SQL in dashboard
- [ ] Step 3A: Run `supabase functions deploy` OR Step 3B: Deploy via dashboard  
- [ ] Step 4.1: Verify `supabase functions list` shows 2 new functions
- [ ] Step 4.2: Test by adding a new lead with LinkedIn URL
- [ ] Step 4.3: Verify persona appears in Lead Detail Page → Persona tab
- [ ] Step 4.4: Test Campaign "Run Now" feature
- [ ] Step 4.5: Verify emails were sent to all leads in campaign

---

## Cost Optimization Verification

After deployment, verify cost optimization is working:

1. **Add a lead** with LinkedIn URL → generates persona (~$0.002 cost)
2. **Go to lead detail page** → Persona shows immediately (reused, $0 cost)
3. **Generate email preview 3 times** with different tones → Each costs ~$0.0003
4. **Run campaign to 5 leads** → Generates 5 personalized emails (~$0.0015 total)

**Key**: Persona is generated once and reused forever. No duplicate generation = cost savings.

---

## What Each Component Does

### generate-persona Edge Function
- **Input**: Lead name, position, LinkedIn URL, website, AI provider, API key
- **Output**: JSON with title, painPoints, priorities, icebreakerHooks, openingLines
- **Cost**: ~$0.001-$0.003 per lead (first time only)
- **Reuse**: Stored in `leads.persona_insights` - reused forever at $0 cost

### send-campaign-emails Edge Function
- **Input**: Campaign ID, provider, API key
- **Output**: Sends personalized emails to all leads in campaign
- **Process**:
  1. Fetches all leads in campaign
  2. For each lead: generates persona-aware email
  3. Sends email via SMTP
  4. Updates campaign stats (emails_sent, last_run_at)
  5. Returns results summary

### Database Changes
- **leads.persona_insights**: JSONB column storing AI-generated persona
- **leads.persona_generated_at**: Timestamp when persona was generated
- **campaigns.emails_sent**: Counter of emails sent for this campaign
- **campaigns.last_run_at**: Last time "Run Now" was clicked
- **sequences** table: Stores email sequence configurations

---

## Support

If you encounter issues:

1. **Check browser console** (F12 → Console) for error messages
2. **Check Supabase logs**:
   - Go to project dashboard
   - Edge Functions → Select function
   - Click "Recent Invocations" or "Logs"
3. **Verify API keys** are set correctly in Settings
4. **Verify database migration** applied successfully

---

**Need to go back to earlier setup?** See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for detailed system overview.
