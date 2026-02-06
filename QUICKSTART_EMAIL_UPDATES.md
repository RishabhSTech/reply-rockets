# Quick Start Guide - Email System Updates

> **TL;DR**: Tone dropdown removed. Use campaign prompts. Save emails as drafts. Track complete email history per lead.

---

## 🎯 Workflow 1: Generate & Send Email (Old Way)

### ❌ Old Process
```
1. Compose → Select Lead
2. Select Tone (professional/casual/friendly)
3. Generate Email
4. Send Immediately
```

### ✅ New Process
```
1. Compose → Select Campaign (provides tone) + Lead
2. Generate Email (no tone dropdown!)
3. Either:
   a) Send Now → goes to lead, status = "intro_sent"
   b) Save as Draft → save for later
```

---

## 📧 Workflow 2: Save & Send Drafts (NEW!)

### Step 1: Save Draft from Composer
```
Compose page:
  1. Select Campaign + Lead
  2. Generate Email
  3. Click [Save as Draft]
  4. ✅ Email saved to Campaign
```

### Step 2: Send Draft Later
```
Campaign Details page:
  1. Scroll to "Draft Emails" section
  2. Find your saved draft
  3. Click [Send] button
  4. Select Email Type:
     ├─ Intro Email (first contact)
     ├─ Follow-up #1 (2nd email)
     ├─ Follow-up #2 (3rd email)
     ├─ Follow-up #3 (4th email)
     └─ Follow-up #4+ (5th+)
  5. Select which leads to send to
  6. Click [Send Now]
  7. ✅ Emails sent! Lead statuses updated
```

---

## 📊 Workflow 3: Check Lead Communication History (NEW!)

### View All Emails Sent to a Lead
```
Lead Profile page:
  1. Click on any lead
  2. Tabs: Overview | Email History | Persona | Email Preview
  3. Click [Email History] tab
  4. See:
     ✉️  Email type (Intro / Follow-up #1 / etc)
     📝  Subject line
     ✅  Status (sent / pending / failed)
     🕐  When sent
     👁️  When opened (if tracked)
     💬  When replied (if applicable)
     🔗  Links clicked
```

---

## 🔄 Lead Status Journey

### See How Lead Status Changes

```
STEP 1: Lead added to campaign
   Status: pending

STEP 2: Send intro email from Composer
   Status: intro_sent ← Email type: "intro"

STEP 3: Lead opens email (optional)
   Status: intro_sent (unchanged)
   Note: Open is tracked but doesn't change status

STEP 4: Send follow-up from Draft
   Select: "Follow-up #1"
   Status: follow_up_1 ← Email type: "follow_up_1"

STEP 5: Send another follow-up from Draft
   Select: "Follow-up #2"
   Status: follow_up_2 ← Email type: "follow_up_2"

STEP 6: Lead replies
   Status: replied (future enhancement)
```

---

## 🚀 Quick Reference

### When to Use Each Email Type

| Type | When | Example |
|------|------|---------|
| **Intro** | First email | Initial cold outreach |
| **Follow-up #1** | 2-3 days later | "Wanted to follow up..." |
| **Follow-up #2** | 5-7 days later | "One more thought..." |
| **Follow-up #3** | 10-14 days later | "Last chance!" |
| **Follow-up #4+** | Beyond 2 weeks | Ongoing nurture |

### Best Practices

**For Email Generation**:
1. ✅ Always select a Campaign (provides tone/voice)
2. ❌ Don't manually select tone (removed)
3. ✅ Use company prompt for consistency

**For Sending**:
1. ✅ Save first draft for review
2. ✅ Edit if needed (change subject/body)
3. ✅ Batch send to multiple leads
4. ✅ Select correct email type (intro vs follow-ups)

**For Lead Management**:
1. ✅ Check Email History tab often
2. ✅ See which email sequences work
3. ✅ Update campaign prompts based on results
4. ✅ Use for model training data

---

## ❓ Common Questions

### Q: Where's the tone selector?
**A**: Removed! Campaign prompts now define tone/voice. Edit your campaign prompt for better emails.

### Q: Can I still send emails directly?
**A**: Yes! Use "Send Now" from Composer. First email always marked as "intro".

### Q: How do I send follow-ups?
**A**: 
1. Save email as draft
2. Go to Campaign → Draft Emails
3. Click Send
4. Select "Follow-up #1" (or #2, etc)
5. Send to leads

### Q: Why am I seeing "intro_sent" status?
**A**: That's the new status! Shows intro email was sent. When you send a follow-up, it changes to "follow_up_1".

### Q: Can I see old emails?
**A**: Yes! Go to Lead Profile → Email History tab. Shows all emails ever sent to that lead.

### Q: What's email type for?
**A**: Tracks email sequence (which # in the follow-up chain). Helps avoid duplicate sends and understand what works.

### Q: Do opens change the status?
**A**: No. Status only changes when you send an email. Opens are tracked separately.

### Q: Can I change email type after sending?
**A**: No, it's locked when sent. But you can send another with a different type.

---

## 🐛 Troubleshooting

### Issue: No tone dropdown in Composer
**Status**: ✅ Expected! It's been removed.
**Fix**: Make sure campaign is selected - campaign provides tone.

### Issue: Can't save as draft
**Check**:
- [ ] Campaign selected?
- [ ] Subject has content?
- [ ] Body has content?

### Issue: Email type selector not showing
**Check**:
- [ ] In Campaign Details page?
- [ ] Looking at Draft Emails?
- [ ] Clicked [Send] button?

### Issue: Lead status not updating
**Check**:
- [ ] Email was actually sent (check SMTP settings)
- [ ] Look at lead status in Leads table

### Issue: Email History tab empty
**Cause**: New feature. Only shows emails sent after this update.
**Next Steps**: Send a test email, it will appear.

---

## 📋 Setup Checklist

Before deploying, make sure:

- [ ] Database migration applied
- [ ] All components deployed
- [ ] Campaign has prompt_json defined
- [ ] SMTP settings configured
- [ ] At least one campaign exists
- [ ] Test lead created

### Verify Installation

1. **Go to Compose page**
   - [ ] No tone dropdown exists
   - [ ] Campaign selector required

2. **Generate an email**
   - [ ] Buttons: Regenerate, Save as Draft, Send Now
   - [ ] Can save as draft without sending

3. **Go to Campaign page**
   - [ ] Draft emails section shows your draft
   - [ ] Can click Send
   - [ ] Email type selector appears

4. **Check lead status**
   - [ ] After sending: status = "intro_sent"
   - [ ] After follow-up: status = "follow_up_1"

5. **View email history**
   - [ ] Lead profile → Email History tab
   - [ ] Shows all sent emails with types

---

## 📚 Full Documentation

For detailed info, see:
- `EMAIL_SYSTEM_UPDATES.md` - Complete guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- Component source code comments

---

## Support

**Something not working?**
1. Check troubleshooting section above
2. Review Implementation Summary
3. Check browser console for errors
4. Verify migration was applied to database

---

**Last Updated**: February 7, 2026
**Status**: ✅ Ready to Use
