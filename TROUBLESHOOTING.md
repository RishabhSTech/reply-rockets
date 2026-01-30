# Troubleshooting: Persona & Campaign Send Failures

## Common Issues & Solutions

### ❌ "Failed to create persona" or "Failed to send campaign emails"

Both errors stem from the same root cause: **Functions haven't been deployed yet**.

---

## Quick Diagnosis

### Step 1: Check if Functions Are Deployed

Open browser DevTools (F12) and go to **Console** tab. When you try to add a lead or run campaign, you should see logs like:

**Good (Function exists)**:
```
Persona response: {data: {persona: {...}}, error: null}
```

**Bad (Function not found)**:
```
Persona response: {data: null, error: {message: "No such Edge Function: 'generate-persona'"}}
```

---

## Root Causes

### Issue 1: Database Migration Not Applied
**Error Message**: "column 'persona_insights' doesn't exist" (when trying to save persona)

**Fix**:
```bash
cd c:\Users\risha\Desktop\reply-rockets
supabase db push
```

**Or manually**:
1. Go to https://app.supabase.com → Project → SQL Editor
2. Run the contents of `supabase/migrations/20260131_add_lead_persona.sql`

---

### Issue 2: Edge Functions Not Deployed
**Error Message**: "No such Edge Function" or function times out

**Fix**:
```bash
cd c:\Users\risha\Desktop\reply-rockets

# Deploy both functions
supabase functions deploy generate-persona
supabase functions deploy send-campaign-emails

# Or deploy all at once
supabase functions deploy
```

**Or manually via dashboard**:
1. Go to https://app.supabase.com → Project → Edge Functions
2. Create function: `generate-persona`
3. Copy contents from `supabase/functions/generate-persona/index.ts`
4. Deploy
5. Repeat for `send-campaign-emails`

---

### Issue 3: Functions in Config but Not Deployed

The `supabase/config.toml` now has:
```toml
[functions.generate-persona]
verify_jwt = false

[functions.send-campaign-emails]
verify_jwt = false
```

**BUT** if you haven't run `supabase functions deploy`, the functions still don't exist in your Supabase project.

---

## Full Deployment Checklist

- [ ] **1. Database Migration**
  - Run: `supabase db push`
  - Verify: Go to Supabase dashboard → Tables → leads → Check for `persona_insights` column

- [ ] **2. Edge Functions**
  - Run: `supabase functions deploy`
  - Verify: Supabase dashboard → Edge Functions → See both functions listed

- [ ] **3. Environment Variables** (if using API keys)
  - Go to Supabase dashboard → Project → Edge Functions → Settings
  - Add secrets: `OPENAI_API_KEY`, `CLAUDE_API_KEY`, etc.

- [ ] **4. Test Persona Generation**
  - Add new lead with LinkedIn URL
  - Wait 2-5 seconds
  - Check browser console for logs
  - Verify persona appears in Lead Detail Page

- [ ] **5. Test Campaign Send**
  - Create campaign with leads
  - Click "Run Now"
  - Check browser console for logs
  - Verify email preview generated for each lead

---

## Detailed Debugging

### If "Failed to create persona" Still Appears

1. **Open browser DevTools** (F12)
2. Go to **Console** tab
3. Add a new lead with LinkedIn URL
4. Look for logs starting with "Persona response:"

**Expected good log**:
```javascript
Persona response: Object { data: {persona: {title: "...", painPoints: [...]}}, error: null }
```

**Expected error log** (will show why it failed):
```javascript
Persona response: Object { data: null, error: {message: "No such Edge Function: 'generate-persona'"} }
// This means: Edge Function not deployed
```

4. If you see "No such Edge Function", run:
```bash
supabase functions deploy generate-persona
```

### If "Failed to send campaign emails" Still Appears

1. **Open browser DevTools** (F12)
2. Go to **Console** tab
3. Click "Run Now" on a campaign
4. Look for logs starting with "Running campaign with provider:" and "Campaign response:"

**Expected good log**:
```javascript
Campaign response: Object { 
  data: {success: true, emailsSent: 5, total: 5, results: [...]}, 
  error: null 
}
```

**Expected error log** (will show why it failed):
```javascript
Campaign response: Object { 
  data: null, 
  error: {message: "No such Edge Function: 'send-campaign-emails'"} 
}
// This means: Edge Function not deployed
```

4. If you see "No such Edge Function", run:
```bash
supabase functions deploy send-campaign-emails
```

---

## Deployment Script (All-in-One)

Create a file called `deploy.ps1`:

```powershell
# deploy.ps1
Write-Host "🚀 Deploying Reply Rockets Persona System..." -ForegroundColor Green
Write-Host ""

# Check if supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI not installed. Installing via npm..." -ForegroundColor Red
    npm install -g supabase
}

Write-Host "🗄️  Step 1: Deploying database migrations..." -ForegroundColor Cyan
supabase db push

Write-Host ""
Write-Host "🔧 Step 2: Deploying Edge Functions..." -ForegroundColor Cyan
supabase functions deploy generate-persona
supabase functions deploy send-campaign-emails

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start your dev server: npm run dev"
Write-Host "2. Test by adding a new lead with a LinkedIn URL"
Write-Host "3. Check that the persona appears in Lead Detail Page"
Write-Host "4. Try the Campaign 'Run Now' feature"
Write-Host ""
```

Run it:
```powershell
.\deploy.ps1
```

---

## After Deployment - Testing Checklist

### Test 1: Persona Generation ✓
```
1. Go to Leads → "Add New Lead"
2. Fill in:
   - Name: John Smith
   - Position: VP of Sales
   - Email: john@example.com
   - LinkedIn: https://linkedin.com/in/johnsmith
3. Click Submit
4. Wait 2-5 seconds
5. Should see toast: "✅ Persona generated successfully!"
6. Click on the lead name to go to Detail Page
7. Click "Persona" tab
8. Should see: Title, Pain Points, Priorities, Icebreaker Hooks, Opening Lines
```

### Test 2: Email Preview ✓
```
1. On Lead Detail Page → "Email Preview" tab
2. Select a tone (professional, casual, urgent, etc)
3. Wait 2-3 seconds
4. Should see generated email subject and body
5. Try different tones and verify each generates unique email
```

### Test 3: Campaign Send ✓
```
1. Go to Campaigns
2. Create a new campaign with 3+ leads
3. Click "Run Now" button
4. Wait 5-10 seconds
5. Should see toast: "✅ Success - Sent X emails out of Y leads"
6. Go to Inbox (if available) to verify emails were sent
```

### Test 4: Cost Optimization ✓
```
1. Add a lead with LinkedIn → Persona generates (~$0.002 cost)
2. Go to Lead Detail Page → Persona shows immediately (reused, $0 cost)
3. Generate email preview 3 times with different tones → Each ~$0.0003
4. Compare: First lead persona = ~$0.002, Reuse = $0 cost savings
```

---

## If Functions Deploy Successfully But Still Fail

### Check Supabase Logs

1. Go to https://app.supabase.com → Project → Edge Functions
2. Click on function name (e.g., "generate-persona")
3. Click "Recent Invocations" or "Logs"
4. Look for error details

**Common Errors in Logs**:

| Error | Solution |
|-------|----------|
| `OpenAI API key not configured` | Add OPENAI_API_KEY to Edge Function settings |
| `column 'persona_insights' doesn't exist` | Run `supabase db push` to apply migration |
| `Failed to fetch leads: ...` | Check database connection or lead table permissions |
| `SMTP_HOST not configured` | Add SMTP settings in Settings → Email Configuration |

---

## Emergency: Manual API Testing

If deployment is failing, test the function directly via curl:

```bash
# Test generate-persona function
curl -X POST \
  https://kzxqeagnrlhyvijylkxp.supabase.co/functions/v1/generate-persona \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "leadName": "John Smith",
    "leadPosition": "VP of Sales",
    "founderLinkedIn": "https://linkedin.com/in/johnsmith",
    "provider": "openai",
    "providerApiKey": "sk-..."
  }'
```

---

## Need More Help?

1. Check console logs (F12 → Console)
2. Check Supabase logs (Edge Functions → Recent Invocations)
3. Verify all 3 components deployed:
   - [ ] Database migration applied (`persona_insights` column exists)
   - [ ] `generate-persona` function deployed
   - [ ] `send-campaign-emails` function deployed
4. Verify API keys configured in Settings

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed setup instructions.
