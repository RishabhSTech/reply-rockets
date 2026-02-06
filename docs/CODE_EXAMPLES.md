# Code Examples: How to Use the New Features

Complete, copy-paste ready examples for implementing the new components.

---

## Example 1: Campaign Sequence Page

**File:** `src/pages/CampaignSequencePage.tsx`

```tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SequenceBuilder } from "@/components/campaigns/SequenceBuilder";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function CampaignSequencePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error("Error loading campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground">Build your outreach sequence</p>
        </div>

        <SequenceBuilder
          campaignId={campaignId!}
          initialSequence={campaign.sequence || []}
        />
      </div>
    </div>
  );
}

// Route:
// {
//   path: "/campaigns/:campaignId/sequence",
//   element: <CampaignSequencePage />
// }
```

---

## Example 2: Templates Page

**File:** `src/pages/TemplatesPage.tsx`

```tsx
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";
import { Header } from "@/components/layout/Header";

export function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <TemplateLibrary />
      </div>
    </div>
  );
}

// Route:
// {
//   path: "/templates",
//   element: <TemplatesPage />
// }
```

---

## Example 3: Add to Settings Page

**File:** `src/pages/SettingsPage.tsx` (updated)

```tsx
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { CompanyInfoSettings } from "@/components/settings/CompanyInfoSettings";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { SmtpSettings } from "@/components/settings/SmtpSettings";
import { WarmupSettings } from "@/components/settings/WarmupSettings";
import { CustomFieldsManager } from "@/components/personalization/CustomFieldsManager";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="company">Company Info</TabsTrigger>
            <TabsTrigger value="ai">AI Provider</TabsTrigger>
            <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
            <TabsTrigger value="warmup">Warmup</TabsTrigger>
            <TabsTrigger value="personalization">Personalization</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanyInfoSettings />
          </TabsContent>

          <TabsContent value="ai">
            <AIProviderSettings />
          </TabsContent>

          <TabsContent value="smtp">
            <SmtpSettings />
          </TabsContent>

          <TabsContent value="warmup">
            <WarmupSettings />
          </TabsContent>

          {/* NEW: Personalization Tab */}
          <TabsContent value="personalization" className="mt-6">
            <CustomFieldsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## Example 4: Update Campaign Leads Page

**File:** `src/components/campaigns/CampaignLeads.tsx` (already has CSV importer)

The CSV importer is already integrated, but here's how it uses custom fields:

```tsx
import { useState, useEffect } from "react";
import { CsvImporter } from "./CsvImporter";
import { supabase } from "@/integrations/supabase/client";

export function CampaignLeads({ campaignId }: CampaignLeadsProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [customFieldColumns, setCustomFieldColumns] = useState<string[]>([]);

  useEffect(() => {
    loadLeads();
    loadCustomFields();
  }, [campaignId]);

  const loadCustomFields = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("custom_fields")
      .select("name")
      .eq("user_id", user.id);

    setCustomFieldColumns((data || []).map(f => f.name));
  };

  const handleImportComplete = () => {
    loadLeads(); // Refresh leads list after import
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campaign Leads</h2>
        
        {/* CSV Importer with custom field support */}
        <CsvImporter 
          campaignId={campaignId}
          onImportComplete={handleImportComplete}
        />
      </div>

      {/* Display leads with custom field columns */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Position</th>
              <th className="px-4 py-2 text-left">Company</th>
              
              {/* Dynamic custom field columns */}
              {customFieldColumns.map(fieldName => (
                <th key={fieldName} className="px-4 py-2 text-left capitalize">
                  {fieldName.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className="border-t">
                <td className="px-4 py-2">{lead.name}</td>
                <td className="px-4 py-2">{lead.email}</td>
                <td className="px-4 py-2">{lead.position}</td>
                <td className="px-4 py-2">{lead.company}</td>
                
                {/* Custom field data */}
                {customFieldColumns.map(fieldName => (
                  <td key={fieldName} className="px-4 py-2">
                    {lead[fieldName] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Example 5: Use Templates in Email Composer

**File:** `src/components/composer/EmailComposer.tsx` (updated)

```tsx
import { useState } from "react";
import { EmailComposer as EmailComposerBase } from "@/components/composer/EmailComposer";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EmailComposerWithTemplates() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleTemplateSelect = (template: any) => {
    // User can copy template from library
    // Then paste into composer
    // This shows the workflow
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Composer */}
      <div className="lg:col-span-2">
        <EmailComposerBase />
      </div>

      {/* Right: Template Library */}
      <div className="lg:col-span-1">
        <div className="sticky top-4">
          <h3 className="font-semibold mb-4">Templates</h3>
          <TemplateLibrary />
        </div>
      </div>
    </div>
  );
}
```

---

## Example 6: Campaign Details with All Features

**File:** `src/pages/CampaignDetailsPage.tsx` (updated)

```tsx
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignOverview } from "@/components/campaigns/CampaignOverview";
import { CampaignLeads } from "@/components/campaigns/CampaignLeads";
import { SequenceBuilder } from "@/components/campaigns/SequenceBuilder";
import { CampaignInbox } from "@/components/campaigns/CampaignInbox";

export function CampaignDetailsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) return null;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="sequence">Sequence</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CampaignOverview campaign={campaign} />
          {/* Now shows open rate capped at 100% with total opens */}
        </TabsContent>

        <TabsContent value="leads">
          <CampaignLeads campaignId={campaignId} />
          {/* CSV importer with custom field mapping */}
        </TabsContent>

        <TabsContent value="sequence">
          <SequenceBuilder 
            campaignId={campaignId}
            initialSequence={campaign.sequence || []}
          />
          {/* Multi-step sequences with conditionals */}
        </TabsContent>

        <TabsContent value="inbox">
          <CampaignInbox campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Example 7: Using Custom Fields in Template

**Email template with custom fields:**

```liquid
Subject: {{company_name}} x [Your Company]: {{quick_win}}

Hi {{first_name}},

I've been researching {{company_name}} and noticed a few things:

1. **Your size:** {{company_size}} employees
2. **Your growth stage:** {{growth_stage}} 
3. **Your current solution:** {{competitor}}

Since you're at the {{growth_stage}} stage, scaling can be tough.
We've helped companies like you reduce sales cycles by 30%.

Quick question: Are you the right person to discuss sales efficiency with,
or should I reach out to {{buying_committee}}?

{{action_link}}

Best,
{{signature}}

---
P.S. If {{company_size}} > {{threshold_employees}}, our enterprise plan might be a better fit.
```

---

## Example 8: Database Setup Script

**File:** `supabase/migrations/create_new_features.sql`

```sql
-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('first_contact', 'follow_up', 're_engagement', 'closing', 'custom')),
  industry TEXT,
  is_shared BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  open_rate NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_user ON email_templates(user_id);
CREATE INDEX idx_templates_industry ON email_templates(industry);
CREATE INDEX idx_templates_shared ON email_templates(is_shared);

-- Create custom_fields table
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'email', 'url', 'select', 'multiselect')),
  required BOOLEAN DEFAULT false,
  options TEXT[],
  default_value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_custom_fields_user ON custom_fields(user_id);

-- Update campaigns table to add sequence column
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sequence JSONB;

-- Add RLS policies for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON email_templates FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can create templates"
  ON email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON email_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for custom_fields
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom fields"
  ON custom_fields FOR ALL
  USING (auth.uid() = user_id);
```

---

## Example 9: Export Variables Helper

**File:** `src/lib/personalization.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";

export const BUILTIN_VARIABLES = {
  first_name: "Lead's first name",
  last_name: "Lead's last name",
  company_name: "Company name",
  industry: "Industry vertical",
  title: "Job title",
  email: "Email address",
  company_website: "Company website URL",
  pain_point: "From persona research",
  icebreaker: "Conversation hook",
};

export async function getAvailableVariables(userId: string) {
  // Get built-in variables
  const builtin = Object.entries(BUILTIN_VARIABLES).map(([key, desc]) => ({
    name: `{{${key}}}`,
    variable: key,
    description: desc,
    category: "builtin" as const,
  }));

  // Get custom fields
  const { data: customFields } = await supabase
    .from("custom_fields")
    .select("name, label")
    .eq("user_id", userId);

  const custom = (customFields || []).map((field) => ({
    name: `{{${field.name}}}`,
    variable: field.name,
    description: field.label,
    category: "custom" as const,
  }));

  return [...builtin, ...custom];
}

export function validateTemplate(template: string, availableVariables: string[]): {
  valid: boolean;
  errors: string[];
} {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...template.matchAll(variableRegex)];
  const errors: string[] = [];

  matches.forEach((match) => {
    const variable = match[1].trim();
    if (!availableVariables.includes(`{{${variable}}}`)) {
      errors.push(`Unknown variable: {{${variable}}}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## Example 10: Testing the Features

**File:** `src/test/features.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("New Features", () => {
  // Test open rate capping
  it("should cap open rate at 100%", () => {
    const emailsSent = 4;
    const emailsOpened = 23; // Multiple opens per email
    const openRate = Math.min(
      Math.round((emailsOpened / emailsSent) * 100),
      100
    );
    expect(openRate).toBe(100); // Not 575%
  });

  // Test sequence builder
  it("should support multiple steps with delays", () => {
    const sequence = [
      {
        id: "1",
        type: "email",
        name: "Intro",
        config: { prompt: "..." },
      },
      {
        id: "2",
        type: "email",
        name: "Follow-up",
        config: { delayDays: 3, prompt: "..." },
      },
      {
        id: "3",
        type: "conditional",
        name: "Smart",
        config: {
          branches: [
            { condition: "opened", delayDays: 2, prompt: "..." },
            { condition: "not_opened", delayDays: 1, prompt: "..." },
          ],
        },
      },
    ];
    expect(sequence).toHaveLength(3);
    expect(sequence[2].type).toBe("conditional");
  });

  // Test custom fields
  it("should support custom field variables", () => {
    const template = "Budget: {{estimated_budget}}";
    const variable = "{{estimated_budget}}";
    expect(template).toContain(variable);
  });
});
```

---

## Quick Copy-Paste Commands

### Show all components
```bash
ls -la src/components/{campaigns,templates,personalization}/
```

### Test components
```bash
npm run test -- features.test.ts
```

### Start development server
```bash
npm run dev
```

---

**Questions?** Review the actual component files for more details.

