# Quick Reference - New Features

## 🚀 What's New

### Feature 1: Auto Lead Persona
**When:** Lead created with LinkedIn/website  
**What happens:** AI generates professional insights automatically  
**Where:** Lead → Persona tab  
**Cost:** $0.001-$0.003 per lead (one-time)

```
Add Lead → Save → Wait 2-5s → Persona appears
```

### Feature 2: Email Preview
**When:** On lead detail page  
**What happens:** Generate sample email in different tones  
**Where:** Lead → Email Preview tab  
**Cost:** $0.0001-$0.001 per generation

```
Select Tone → Click Generate → See preview
```

### Feature 3: Campaign Run Now
**When:** On campaigns page  
**What happens:** Send personalized emails to all leads  
**Where:** Campaigns → Click "Run Now"  
**Cost:** $0.0001-$0.001 per email (uses stored personas)

```
Click "Run Now" → Sending... → See results in 15-25s
```

---

## 📋 Files to Deploy

### Must Deploy
```bash
supabase/migrations/20260131_add_lead_persona.sql
supabase/functions/generate-persona/index.ts
supabase/functions/send-campaign-emails/index.ts
src/pages/LeadDetailPage.tsx
```

### Must Update
```bash
src/App.tsx                          # Added route
src/components/leads/LeadForm.tsx    # Background persona
src/pages/CampaignsPage.tsx          # Run Now button
src/components/leads/LeadsList.tsx   # Made clickable
```

---

## ⚙️ Setup Steps

1. Run migration:
   ```bash
   supabase db push
   ```

2. Deploy functions:
   ```bash
   supabase functions deploy generate-persona
   supabase functions deploy send-campaign-emails
   ```

3. Test in UI:
   - Add lead with LinkedIn
   - Wait for persona
   - Click lead → Persona tab
   - Test Email Preview
   - Test Campaign → Run Now

---

## 💡 Usage Examples

### Adding a Lead with Persona
1. Go to Leads
2. Fill: Name, Position, Requirement, **LinkedIn** (or Website)
3. Click "Save Lead"
4. Wait 2-5s
5. Click lead → Persona tab → See insights!

### Previewing Email Tone
1. Go to Leads
2. Click any lead
3. Go to "Email Preview" tab
4. Select: Professional, Casual, Friendly, or Direct
5. Click "Generate"
6. See what will be sent before committing

### Sending Campaign to All Leads
1. Go to Campaigns
2. Find campaign with leads
3. Click "Run Now" button
4. Wait for "Sent X/Y emails"
5. Check inbox for emails

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Persona not appearing | Wait 5s, refresh page, check browser console |
| Campaign send fails | Check SMTP settings, verify lead emails valid |
| Email preview blank | Ensure lead has LinkedIn/website data |
| No "Run Now" button | Create campaign and add leads first |
| API key error | Add key in Settings → AI Provider |

---

## 📊 Costs Breakdown

```
1000 lead outreach campaign:

Persona generation:     $1-$3    (one time)
Email sending (Lovable): $0.10   (per campaign)
Email sending (OpenAI):  $1.00   (per campaign)
Email sending (Claude):  $3.00   (per campaign)

Total per campaign: $1.10 - $7.00
```

---

## 🎯 Best Practices

✅ **Do This:**
- Add LinkedIn/website for persona generation
- Use Lovable for bulk campaigns (cheapest)
- Preview email before sending
- Run campaigns during business hours
- Check SMTP settings before run

❌ **Don't Do This:**
- Regenerate personas constantly (costs money)
- Send campaigns without preview
- Mix provider API keys (confusing)
- Run campaigns to invalid emails
- Send too many emails at once (SMTP limits)

---

## 🔐 Important Notes

- Personas stored forever (no regeneration needed)
- API keys stored locally (browser storage)
- Campaign sends are blocking (wait for completion)
- Email previews don't send real emails
- Statistics updated in real-time

---

## 📞 Common Questions

**Q: How long does persona generation take?**  
A: 3-5 seconds typically. Runs in background, doesn't freeze UI.

**Q: Can I send to 10,000 leads at once?**  
A: Not recommended. Would take ~2-3 minutes. Better to split into smaller campaigns.

**Q: What if lead has no LinkedIn/website?**  
A: Persona won't auto-generate. You can still send emails based on name + position.

**Q: Can I retry failed emails in campaign?**  
A: Not currently built in. Manual approach: export failed list, re-add leads, run again.

**Q: Do I need OpenAI key if using Lovable?**  
A: No. Pick one provider. Lovable is free tier friendly.

---

## 🚨 Error Messages

| Error | What it means |
|-------|---------------|
| "Missing API key" | Add key in Settings before generating |
| "No leads in campaign" | Add leads to campaign first |
| "Invalid email" | Lead email is malformed or empty |
| "Rate limit exceeded" | Too many API calls too fast, wait a moment |
| "Persona generation failed" | Check your LinkedIn/website URL format |

---

## 📈 Monitoring

Watch logs while testing:
```bash
# See persona generation
supabase functions logs generate-persona

# See campaign sends  
supabase functions logs send-campaign-emails

# See all errors
SELECT * FROM error_logs ORDER BY created_at DESC;
```

---

## 🎓 Architecture Summary

```
Lead + LinkedIn/Website
         ↓
    [generate-persona]  → Stores persona
         ↓
    [Lead Detail Page]  → Shows 3 tabs
         ↓
    [Email Preview]     → Test different tones
         ↓
    [Campaign "Run Now"] → Send personalized emails to all
```

All reuses stored data for cost efficiency.
