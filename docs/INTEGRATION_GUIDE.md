# Integration & Component Usage Guide

## Component Locations & Integration

This guide shows where to import and use the newly created/enhanced components.

---

## 1. CampaignOverview (Fixed)

**Location:** `src/components/campaigns/CampaignOverview.tsx`

**Already Integrated In:** Campaign detail pages

**Changes Made:**
- Open rate now caps at 100%
- Shows "total opens" when multiple opens detected
- Added `totalOpens` to stats state

**No migration needed** - existing usage continues to work with improved display.

---

## 2. SequenceBuilder (Enhanced)

**Location:** `src/components/campaigns/SequenceBuilder.tsx`

**Add to:** Campaign setup/editing pages

**Usage Example:**
```tsx
import { SequenceBuilder } from "@/components/campaigns/SequenceBuilder";

export function CampaignSetupPage() {
  return (
    <SequenceBuilder 
      campaignId={campaignId}
      initialSequence={campaign.sequence || []}
    />
  );
}
```

**Props:**
- `campaignId: string` - Campaign ID for saving
- `initialSequence: Step[]` - Pre-existing sequence (optional)

**Features Now Available:**
- ✅ Multi-step email sequences
- ✅ Time delays between steps
- ✅ Conditional branching (if opened/replied)
- ✅ Visual pipeline UI
- ✅ AI prompt customization per step

**Database Column Required:**
```sql
ALTER TABLE campaigns ADD COLUMN sequence JSONB;
```

---

## 3. TemplateLibrary (New Component)

**Location:** `src/components/templates/TemplateLibrary.tsx`

**Add to:** Templates page (new route)

**Usage Example:**
```tsx
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";

export function TemplatesPage() {
  return (
    <div className="p-6">
      <TemplateLibrary />
    </div>
  );
}
```

**Features:**
- ⭐ Pre-built industry templates (SaaS, eCommerce, B2B)
- 🎨 Create custom templates
- 📊 View performance metrics
- 🔍 Search & filter
- 📋 Copy to clipboard

**Route to Add:**
```tsx
{
  path: "/templates",
  element: <TemplatesPage />
}
```

**Database Tables Required:**
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  industry TEXT,
  is_shared BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  open_rate NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_user ON email_templates(user_id);
CREATE INDEX idx_templates_industry ON email_templates(industry);
```

---

## 4. CustomFieldsManager (New Component)

**Location:** `src/components/personalization/CustomFieldsManager.tsx`

**Add to:** Settings page

**Usage Example:**
```tsx
import { CustomFieldsManager } from "@/components/personalization/CustomFieldsManager";

export function SettingsPage() {
  return (
    <Tabs defaultValue="general">
      {/* ... other tabs ... */}
      <TabsContent value="personalization">
        <CustomFieldsManager />
      </TabsContent>
    </Tabs>
  );
}
```

**Features:**
- 📋 View all personalization variables
- ➕ Create custom fields
- 💧 Reference Liquid syntax guide
- 📋 Copy variables to clipboard

**Database Tables Required:**
```sql
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,           -- "estimated_budget"
  label TEXT NOT NULL,          -- "Estimated Budget"
  type TEXT NOT NULL,           -- 'text', 'number', 'select', etc.
  required BOOLEAN DEFAULT false,
  options TEXT[],               -- For select fields
  default_value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_custom_fields_user ON custom_fields(user_id);
```

---

## 5. CsvImporter (Enhanced)

**Location:** `src/components/campaigns/CsvImporter.tsx`

**Already Integrated In:** CampaignLeads component

**Usage Example:**
```tsx
import { CsvImporter } from "@/components/campaigns/CsvImporter";

// Inside CampaignLeads or similar:
<CsvImporter 
  campaignId={campaignId}
  onImportComplete={handleImportComplete}
/>
```

**Props:**
- `campaignId: string` - Which campaign to import to
- `onImportComplete: () => void` - Callback when done

**New Features:**
- 🧙 3-step wizard (upload → map → confirm)
- 🔗 Field mapping UI
- 🎯 Support for custom fields
- ✅ Validation & error reporting
- 📊 Import statistics

**Existing Integration:**
Already used in `CampaignLeads.tsx` - no changes needed, but now supports custom fields!

---

## Navigation & Routing

### Recommended URL Paths

```
/campaigns              - Main campaigns page
  /campaigns/:id       - Campaign details
    /settings          - Campaign settings
    /leads             - Leads management (with CSV import)
    /sequence          - Sequence builder

/settings              - User settings
  /personalization     - Custom fields manager

/templates             - Template library (NEW)

/compose               - Email composer (already exists)
```

### Example Route Configuration

```tsx
// In your router/main routing file
export const routes = [
  // ... existing routes ...
  {
    path: "/templates",
    element: <TemplatesPage />
  },
  {
    path: "/settings",
    element: <SettingsPage />,
    children: [
      {
        path: "personalization",
        element: <div><CustomFieldsManager /></div>
      }
    ]
  },
  {
    path: "/campaigns/:id/sequence",
    element: <SequencePage />
  }
];
```

---

## Component Dependencies

### Import Map

```tsx
// CampaignOverview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, MousePointerClick, MessageSquare, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// SequenceBuilder.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock, Mail, GitBranch } from "lucide-react";

// TemplateLibrary.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Star, Trash2, Search, TrendingUp, Users } from "lucide-react";

// CustomFieldsManager.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Code2, Eye, AlertCircle, Check } from "lucide-react";

// CsvImporter.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, File, AlertCircle, Check, ChevronRight, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

---

## Data Flow Diagram

```
User Workflow:
┌──────────────────────────────────────────────────────┐
│  Settings > Personalization                          │
│  └─ CustomFieldsManager component                    │
│     └─ Creates custom fields in DB                   │
└────────────────┬───────────────────────────────────┘
                 │
    ┌────────────▼───────────────┐
    │ Campaign Setup/Edit        │
    ├───────────────────────────┤
    │ 1. Import Leads (CSV)     │◄─── CSV Import Step 1 (Upload)
    │    └─ CsvImporter         │     └─ Maps to custom fields
    │       └─ Uses custom      │
    │         fields loaded     │
    │         from DB           │
    │                           │
    │ 2. Build Sequence         │◄─── Sequence Step
    │    └─ SequenceBuilder     │     └─ Multi-step pipeline
    │       └─ Email + Logic    │        with conditionals
    │       └─ AI Prompts       │
    │                           │
    │ 3. Select Templates       │◄─── Templates Step
    │    └─ TemplateLibrary     │     └─ Pre-built or custom
    │       └─ Use vars from    │        with performance data
    │         CustomFields      │
    └───────────────────────────┘
                 │
    ┌────────────▼───────────────┐
    │ Campaign Execution         │
    ├───────────────────────────┤
    │ • Emails sent             │
    │ • Opens tracked           │◄─── CampaignOverview (Fixed)
    │ • Rate display capped     │     - Open rate at 100%
    │ • Total opens shown       │     - Shows engagement data
    └───────────────────────────┘
```

---

## Quick Integration Checklist

- [ ] Copy new components to correct directories
- [ ] Add database tables (email_templates, custom_fields)
- [ ] Update campaign table with `sequence` JSONB column
- [ ] Import components in respective pages
- [ ] Add routes for templates page
- [ ] Add settings tab for personalization
- [ ] Test CSV import with custom field mapping
- [ ] Test sequence builder with conditionals
- [ ] Verify open rate display caps at 100%
- [ ] Test template copy-to-clipboard
- [ ] Verify custom field variables appear in personalization panel

---

## Customization Points

### Template Library
To add more pre-built templates, edit `INDUSTRY_PRESETS` constant in `TemplateLibrary.tsx`:
```tsx
const INDUSTRY_PRESETS: Record<string, EmailTemplate[]> = {
    "Your Industry": [
        {
            id: "industry_1",
            name: "Template Name",
            subject: "Subject {{variables}}",
            body: "Email body...",
            category: "first_contact",
            industry: "Your Industry",
            usageCount: 0,
        }
    ]
};
```

### Custom Field Types
Add new custom field types in `CustomFieldsManager.tsx`:
```tsx
<SelectItem value="date">Date Picker</SelectItem>
<SelectItem value="textarea">Long Text</SelectItem>
<SelectItem value="currency">Currency</SelectItem>
```

### Sequence Conditions
Add new conditional branches in `SequenceBuilder.tsx`:
```tsx
{ condition: "clicked", delayDays: 3, name: "If Clicked", prompt: "..." }
```

---

## Performance Notes

- **TemplateLibrary**: Uses pre-built presets + database queries (minimal load)
- **CustomFieldsManager**: Lazy loads on settings tab open
- **CsvImporter**: Parses CSV in-browser, batch inserts to DB
- **SequenceBuilder**: Stores sequence as JSONB, efficient for queries

---

## Support Documentation

For end-user guides:
- See [TEMPLATE_QUICK_REFERENCE.md](../TEMPLATE_QUICK_REFERENCE.md)
- See [CMO_BOT_PROMPT_FRAMEWORK.md](../CMO_BOT_PROMPT_FRAMEWORK.md)
- See [RESEARCH_BASED_PERSONALIZATION.md](../RESEARCH_BASED_PERSONALIZATION.md)

