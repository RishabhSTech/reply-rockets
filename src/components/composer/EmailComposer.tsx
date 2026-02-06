import { useState, useEffect } from "react";
import React from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Sparkles, Copy, RefreshCw, Send, Wand2, Users, Loader2, Eye, EyeOff, AlertCircle, Mail } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  position: string;
  requirement: string;
  email: string | null;
  founder_linkedin: string | null;
  website_url: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  prompt_json?: any;
}

interface CompanyInfo {
  company_name: string | null;
  description: string | null;
  value_proposition: string | null;
  target_audience: string | null;
  key_benefits: string | null;
}

interface EmailComposerProps {
  className?: string;
}

export function EmailComposer({ className }: EmailComposerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  
  // Prevent double-sends with a ref lock
  const sendLockRef = React.useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper function to log errors
  const logError = async (component: string, message: string, details?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use raw fetch since error_logs may not be in generated types yet
      const session = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/error_logs`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: user.id,
          component,
          error_message: message,
          error_details: details,
        }),
      });

      console.error(`[${component}] ${message}`, details);
    } catch (err) {
      console.error("Failed to log error:", err);
    }
  };

  useEffect(() => {
    loadLeads();
    loadCampaigns();
    loadCompanyInfo();
  }, []);

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, position, requirement, email, founder_linkedin, website_url")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeads(data);
    }
  };

  const loadCampaigns = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, status, prompt_json")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCampaigns(data as any);
    }
  };

  const loadCompanyInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("company_info")
      .select("company_name, description, value_proposition, target_audience, key_benefits")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setCompanyInfo(data);
    }
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const handleGenerate = async () => {
    if (!selectedLead) {
      toast({
        title: "Select a lead",
        description: "Please select a lead to generate a personalized email",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCampaignId) {
      toast({
        title: "Select campaign",
        description: "Please select a campaign to generate email for",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSubject("");
    setBody("");

    try {
      // Get selected campaign's prompt
      const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
      if (!selectedCampaign) {
        throw new Error("Campaign not found");
      }

      // Get selected AI provider from settings
      const provider = localStorage.getItem('ai_provider') || 'lovable';
      const providerApiKey =
        provider === 'openai'
          ? localStorage.getItem('openai_api_key') || undefined
          : provider === 'claude'
            ? localStorage.getItem('claude_api_key') || undefined
            : undefined;

      if ((provider === 'openai' || provider === 'claude') && !providerApiKey) {
        toast({
          title: "Missing API key",
          description: "Please add your API key in Settings before generating.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: {
          leadName: selectedLead.name,
          leadPosition: selectedLead.position,
          leadRequirement: selectedLead.requirement,
          leadLinkedIn: selectedLead.founder_linkedin,
          leadWebsite: selectedLead.website_url,
          companyInfo: companyInfo || {},
          campaignContext: selectedCampaign.prompt_json,
          provider,
          providerApiKey,
        },
      });

      if (error) throw error;
      if (!data) {
        throw new Error("Failed to generate email - no response from server");
      }

      // Extract subject and body from response
      const generatedSubject = data.subject || "";
      const generatedBody = data.body || "";

      if (!generatedSubject || !generatedBody) {
        throw new Error("Failed to generate complete email (missing subject or body)");
      }

      setSubject(generatedSubject);
      setBody(generatedBody);

      toast({
        title: "Email generated",
        description: "Your personalized email is ready to review and send",
      });
    } catch (error) {
      console.error("Generation error:", error);
      await logError(
        "EmailComposer",
        error instanceof Error ? error.message : "Unknown generation error",
        { error: String(error) }
      );
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate email",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    // CRITICAL: Prevent double-sends - if already sending, exit immediately
    if (isSending || sendLockRef.current) {
      console.warn("⚠️ Send already in progress, ignoring duplicate request");
      return;
    }

    if (!selectedLead?.email) {
      toast({
        title: "No email address",
        description: "This lead doesn't have an email address",
        variant: "destructive",
      });
      return;
    }

    if (!subject || !body) {
      toast({
        title: "Missing content",
        description: "Please generate or write an email first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCampaignId) {
      toast({
        title: "Select campaign",
        description: "Please select a campaign to send this email to",
        variant: "destructive",
      });
      return;
    }

    // Set lock BEFORE state update
    sendLockRef.current = true;
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const personalizedBody = body.replace(/\{\{name\}\}/gi, selectedLead.name.split(" ")[0]);

      // Send email via edge function
      const { data: emailData, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          toEmail: selectedLead.email,
          subject,
          body: personalizedBody,
          leadId: selectedLead.id,
          userId: user.id,
          campaignId: selectedCampaignId,
          emailType: "intro", // Label as intro email
        },
      });

      if (sendError) throw sendError;

      toast({
        title: "Email sent successfully",
        description: `Email sent to ${selectedLead.email}. Redirecting to campaign...`,
      });

      // Clear form
      setSubject("");
      setBody("");
      setSelectedLeadId("");
      setSelectedCampaignId("");
      setShowPreview(false);

      // Redirect to campaign details
      setTimeout(() => {
        navigate(`/campaigns/${selectedCampaignId}`);
      }, 1500);
    } catch (error) {
      console.error("Send error:", error);
      await logError(
        "EmailComposer",
        error instanceof Error ? error.message : "Unknown send error",
        { error: String(error), leadEmail: selectedLead?.email }
      );
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      sendLockRef.current = false;
    }
  };

  const handleSaveAsDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Missing content",
        description: "Please add a subject and body before saving",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCampaignId) {
      toast({
        title: "Select campaign",
        description: "Please select a campaign to save this draft to",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDraft(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/draft_emails`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            campaign_id: selectedCampaignId,
            user_id: user.id,
            subject,
            body,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      toast({
        title: "Draft saved",
        description: "Email saved as draft. You can send it later from the campaign.",
      });

      // Clear the form
      setSubject("");
      setBody("");
      setSelectedLeadId("");
    } catch (error) {
      console.error("Save draft error:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border overflow-hidden",
        className
      )}
    >
      <div className="p-5 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Email Composer</h3>
            <p className="text-sm text-muted-foreground">
              Generate personalized outreach in seconds
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Campaign Selection */}
        <div className="space-y-2">
          <Label htmlFor="campaign-select">Select Campaign</Label>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue placeholder="Choose a campaign to send to" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.length === 0 ? (
                <SelectItem value="none" disabled>
                  No active campaigns available
                </SelectItem>
              ) : (
                campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <span>{campaign.name}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Lead Selection */}
        <div className="space-y-2">
          <Label htmlFor="lead-select">Select Lead</Label>
          <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue placeholder="Choose a lead to personalize for" />
            </SelectTrigger>
            <SelectContent>
              {leads.length === 0 ? (
                <SelectItem value="none" disabled>
                  No leads available
                </SelectItem>
              ) : (
                leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{lead.name}</span>
                      <span className="text-muted-foreground">- {lead.position}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedLead && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <p><span className="text-muted-foreground">Position:</span> {selectedLead.position}</p>
            <p><span className="text-muted-foreground">Context:</span> {selectedLead.requirement}</p>
            {selectedLead.email && (
              <p><span className="text-muted-foreground">Email:</span> {selectedLead.email}</p>
            )}
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedLeadId || !selectedCampaignId}
          className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate Email
            </>
          )}
        </Button>

        {/* Generated Email */}
        {(subject || body) && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Preview Toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Preview & Edit</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Show Preview
                  </>
                )}
              </Button>
            </div>

            {/* Preview Section */}
            {showPreview && (
              <div className="mb-4 p-4 rounded-lg bg-muted border border-border">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Subject</span>
                    <p className="mt-1 text-sm font-medium break-words">{subject}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Preview</span>
                    <div className="mt-1 text-sm whitespace-pre-wrap break-words bg-background p-3 rounded border max-h-64 overflow-y-auto">
                      {body.replace(/\{\{name\}\}/gi, selectedLead?.name?.split(" ")[0] || "[First Name]")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Subject Line</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(subject);
                    toast({ title: "Copied", description: "Subject copied to clipboard" });
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
              </div>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-secondary border-0"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Email Body</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(body);
                    toast({ title: "Copied", description: "Body copied to clipboard" });
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
              </div>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Write your email body here..."
                className="min-h-[400px] bg-secondary border-0"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleSaveAsDraft}
                disabled={isSavingDraft || !selectedCampaignId || !subject || !body}
              >
                {isSavingDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {isSavingDraft ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-emerald-600/80 hover:from-emerald-700 hover:to-emerald-700/80"
                onClick={handleSendEmail}
                disabled={isSending || !selectedLead?.email || !selectedCampaignId}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
