# Email System Updates & Lead Status Tracking

## Overview

This document outlines the comprehensive updates to the Reply Rockets email system, including improvements to the AI Email Composer, campaign draft management, lead status tracking, and email history.

## Key Changes

### 1. **AI Email Composer Improvements**

#### Removed Tone Selection
- **What Changed**: The tone dropdown selector has been removed from the EmailComposer
- **Why**: The company prompt (campaign prompt_json) now drives the email tone and style instead of manual tone selection
- **Result**: Consistent emails aligned with company voice across all campaigns

#### Company Prompt Integration
- **What Changed**: Email generation now uses the selected campaign's prompt_json as the primary template
- **Files Modified**: `src/components/composer/EmailComposer.tsx`
- **Parameters Sent**:
  ```typescript
  const { data, error } = await supabase.functions.invoke('generate-email', {
    body: {
      leadName: selectedLead.name,
      leadPosition: selectedLead.position,
      leadRequirement: selectedLead.requirement,
      leadLinkedIn: selectedLead.founder_linkedin,
      leadWebsite: selectedLead.website_url,
      companyInfo: companyInfo || {},
      campaignContext: selectedCampaign.prompt_json, // Campaign prompt drives output
      provider,
      providerApiKey,
    },
  });
  ```

#### Save as Draft Option
- **What Changed**: Added "Save as Draft" button alongside "Send Now"
- **File**: `src/components/composer/EmailComposer.tsx` (new function: `handleSaveAsDraft`)
- **Features**:
  - Save generated emails as drafts without sending
  - Drafts are saved to the `draft_emails` table
  - Can be edited and sent later from the Campaign details page
  - Useful for reviewing emails before sending

**UI Actions Available**:
1. Generate Email (from selected lead + campaign)
2. Regenerate (get a different version)
3. Save as Draft (store for later)
4. Send Now (send immediately to lead)

---

### 2. **Campaign Draft Email Improvements**

#### Direct Send from Drafts
- **What Changed**: Added ability to send draft emails directly from the DraftEmails component
- **File**: `src/components/campaigns/DraftEmails.tsx`
- **New Feature**: Email Type Selector

**Email Type Options**:
- **Intro Email**: First contact with a lead
- **Follow-up #1**: First follow-up (2-3 days after intro)
- **Follow-up #2**: Second follow-up
- **Follow-up #3**: Third follow-up
- **Follow-up #4+**: Subsequent follow-ups

**How It Works**:
1. Click "Send" button on any draft
2. Select email type (defaults to "Intro")
3. Choose which leads to send to
4. Click "Send Now"
5. System automatically updates lead status based on email type

---

### 3. **Enhanced Lead Status Tracking**

#### Status Values
Leads now have more granular status tracking:

```
pending → intro_sent → follow_up_1 → follow_up_2 → follow_up_3+ → replied/bounced
```

#### New/Updated Fields in `leads` Table
```sql
intro_sent_at TIMESTAMP         -- When intro email was sent
follow_up_count INTEGER         -- Number of follow-ups sent (1, 2, 3, etc)
last_email_sent_at TIMESTAMP    -- When last email was sent
campaign_id UUID                -- Which campaign lead belongs to
```

#### Status Update Logic
- **When intro email sent**: `status = "intro_sent"` + `intro_sent_at` timestamp
- **When follow-up #1 sent**: `status = "follow_up_1"` + `follow_up_count = 1`
- **When follow-up #2 sent**: `status = "follow_up_2"` + `follow_up_count = 2`
- **When reply received**: `status` changes to reflect interaction

#### Email Opens Don't Change Status
- If a lead opens the intro email, the status stays as `intro_sent`
- This helps you know they're interested but haven't replied yet
- Sending a follow-up upgrades the status to `follow_up_1`

---

### 4. **Comprehensive Email History Tracking**

#### New Tab in Lead Detail Page
- **Location**: Lead Profile → "Email History" tab
- **Component**: `src/components/leads/EmailHistory.tsx`
- **Data Source**: `email_logs` table

#### Email History Shows
For each email sent to a lead:
1. **Email Type**: Intro, Follow-up #1, Follow-up #2, etc.
2. **Subject Line**: Full email subject
3. **Status**: 
   - `sent` ✅ (green)
   - `pending` ⏳ (yellow)
   - `failed` ❌ (red)
4. **Email Preview**: First 150 characters of body
5. **Timestamps**:
   - ✉️ Sent date & time
   - 👁️ Opened date (if opened)
   - 💬 Replied date (if replied)
6. **Error Messages**: Any delivery errors displayed

#### Email History UI Features
- **Chronological Order**: Newest emails first
- **Status Icons**: Visual indicators for quick scanning
- **Metadata**: Displays all interaction timestamps
- **Training Data**: Helps identify what works for AI model training

---

### 5. **Database Enhancements**

#### New Migration File
**File**: `supabase/migrations/20260207_enhance_email_tracking_and_lead_status.sql`

**Key Changes**:
1. **Added Columns to `email_logs`**:
   ```sql
   email_type TEXT          -- 'intro', 'follow_up_1', etc
   campaign_id UUID         -- Links email to campaign
   opened_at TIMESTAMP      -- Track opens
   clicked_at TIMESTAMP     -- Track clicks
   replied_at TIMESTAMP     -- Track replies
   bounced_at TIMESTAMP     -- Track bounces
   ```

2. **New Table: `email_interactions`**
   - Tracks granular interactions (opens, clicks, bounces)
   - One row per interaction event
   - Stores interaction metadata (link clicked, bounce reason, etc)

3. **Indexes for Performance**:
   - Index on `lead_id` (fast lead lookups)
   - Index on `campaign_id` (fast campaign lookups)
   - Index on `sent_at` (time-range queries)
   - Index on `user_id + status` (filtering)

4. **Database Triggers**:
   - Automatic status updates when emails are sent
   - Updates `follow_up_count` based on email sequence
   - Records `intro_sent_at` and `last_email_sent_at` timestamps

---

## Implementation Details

### Email Generation Flow

```
EmailComposer.tsx
  ↓
User selects: Lead + Campaign
  ↓
Campaign contains: prompt_json (company voice/tone)
  ↓
generate-email edge function
  ↓
AI generates email using company prompt (not tone dropdown)
  ↓
User can: Save as Draft OR Send Now
```

### Email Sending Flow

```
Send Email (EmailComposer OR DraftEmails)
  ↓
Include emailType parameter: "intro" or "follow_up_1", etc
  ↓
send-email edge function
  ↓
1. Create email_log entry with status="pending"
  ↓
2. Add tracking pixel for opens
  ↓
3. Wrap links for click tracking
  ↓
4. Send via SMTP
  ↓
5. Update email_log to status="sent"
  ↓
6. Update lead status based on email_type:
     - intro → status="intro_sent"
     - follow_up_1 → status="follow_up_1", follow_up_count=1
     - follow_up_2 → status="follow_up_2", follow_up_count=2
     - etc.
```

### Lead Status Evolution

```
NEW LEAD
  ↓
Lead added to campaign (status = "pending")
  ↓
First email sent from EmailComposer
  ↓
status = "intro_sent" ✓
intro_sent_at = now
  ↓
[Optionally: Email is opened - no status change, but tracked]
  ↓
Follow-up sent from DraftEmails (type: follow_up_1)
  ↓
status = "follow_up_1"
follow_up_count = 1
  ↓
[Lead might reply]
  ↓
Another follow-up sent (type: follow_up_2)
  ↓
status = "follow_up_2"
follow_up_count = 2
```

---

## Files Modified

### Core Components
1. **`src/components/composer/EmailComposer.tsx`**
   - Removed `tone` state
   - Added `isSavingDraft` state
   - Updated `handleGenerate` to use campaign context
   - Added `handleSaveAsDraft` function
   - Updated button layout (Regenerate + Save Draft + Send)

2. **`src/components/campaigns/DraftEmails.tsx`**
   - Added `emailType` state
   - Added email type selector in send dialog
   - Updated `handleSendDraft` to include `emailType` parameter
   - Improved send context around draft sending

3. **`src/components/leads/EmailHistory.tsx`** (NEW)
   - Displays all emails sent to a lead
   - Shows email type, subject, status, timestamps
   - Color-coded status badges
   - Handles migration period (email_type column may not exist)

4. **`src/pages/LeadDetailPage.tsx`**
   - Added EmailHistory import
   - Added "Email History" tab to lead profile
   - Positioned before Persona, after Overview

### Backend Updates
1. **`supabase/functions/send-email/index.ts`**
   - Updated `SendEmailRequest` interface to include `emailType`
   - Added email_type parameter to email_logs insert
   - Enhanced lead status update logic:
     - Tracks intro vs follow-up emails
     - Updates follow_up_count based on email_type
     - Sets intro_sent_at timestamp
     - Updates last_email_sent_at on every send

### Database
1. **`supabase/migrations/20260207_enhance_email_tracking_and_lead_status.sql`** (NEW)
   - Adds new columns to leads table
   - Adds new columns to email_logs table
   - Creates email_interactions table
   - Sets up triggers for auto-status updates
   - Creates performance indexes

---

## User Workflows

### Workflow 1: Generate and Send Intro Email

```
1. Navigate to Compose page
2. Select Campaign (campaign's prompt drives tone
3. Select Lead
4. Click "Generate Email"
5. Review generated subject and body
6. Edit if needed
7. Click "Send Now" → email sent, lead status = "intro_sent"
```

### Workflow 2: Save Email as Draft

```
1. Follow steps 1-6 from Workflow 1
2. Instead of "Send Now", click "Save as Draft"
3. Draft saved, form cleared
4. Later: Go to Campaign → Draft Emails → Click "Send"
5. Select email type (Intro, Follow-up #1, etc)
6. Select leads to send to
7. Click "Send Now"
```

### Workflow 3: Send Follow-up Email to Leads

```
1. Go to Campaign page
2. Scroll to "Draft Emails" section
3. Click "Send" on a saved draft
4. Select email type: "Follow-up #1" ← Important!
5. Select leads (e.g., those with status="intro_sent")
6. Click "Send Now"
7. Each lead's status → "follow_up_1", follow_up_count → 1
```

### Workflow 4: Check Lead Communication History

```
1. Go to Leads page
2. Click on a lead to view profile
3. Click "Email History" tab
4. See all emails ever sent:
   - What type (intro, follow-up #1, etc)
   - When sent
   - Whether opened/replied
   - Any delivery errors
5. Use data to train AI on what works
```

---

## Configuration

### No New Configuration Required
- All changes use existing infrastructure
- Campaign prompts already configured in Campaigns
- SMTP settings already set up
- No new API keys or environment variables

### For Best Results

#### Set Up Campaign Prompts
Each campaign should have a detailed `prompt_json`:
```json
{
  "system_prompt": "You are a professional outreach specialist...",
  "tone": "Professional but personable",
  "key_value": "...",
  "call_to_action": "..."
}
```

#### Lead Data Requirements
- Lead name, position, requirement
- Email address (for sending)
- LinkedIn/Website (for generation context)

---

## Data Training Implications

Email history tracking now provides rich training data:
- Which email sequences convert best
- Which leads respond to which message types
- Open and click patterns by lead profile
- Reply sentiment analysis (future enhancement)

**To use for training**:
1. Go to Lead Profile → Email History tab
2. Analyze patterns across multiple leads
3. Identify high-engagement sequences
4. Update campaign prompts based on learnings

---

## Next Steps / Future Enhancements

**Recommended**:
1. ✅ Deploy migration to production
2. ✅ Test email generation without tone dropdown
3. ✅ Send a follow-up email with proper email_type
4. ✅ View Lead Profile → Email History to verify tracking

**Planned Features**:
- [ ] A/B testing by email type
- [ ] Automatic follow-up scheduling
- [ ] Reply sentiment analysis
- [ ] Email template library (by performance)
- [ ] Draft email templates with email type selection
- [ ] Analytics dashboard by email sequence

---

## Troubleshooting

### Q: Email type selector not appearing?
**A**: Make sure you're in the "Send Draft Email" dialog. It appears when you click "Send" on a saved draft.

### Q: Lead status not updating?
**A**: Ensure the send-email function was called with the `emailType` parameter. Check logs.

### Q: Email history showing blank?
**A**: New emails will populate as they're sent. Older emails may not have email_type if sent before this update.

### Q: "Save as Draft" not working?
**A**: Verify:
- Campaign is selected
- Subject and body have content
- You have write permissions to draft_emails table

---

## Support

For issues:
1. Check error logs (Settings → Error Logs)
2. Verify migration was applied to Supabase
3. Ensure SMTP settings are configured
4. Check browser console for client errors

---

**Last Updated**: February 7, 2026  
**Status**: ✅ Production Ready  
**Tested Features**: Email generation, draft saving, email sending, lead status updates
