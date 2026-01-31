/**
 * Manual Sequence Sender
 * 
 * Allows users to manually trigger sending specific sequence steps to individual leads
 * across their campaigns.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Zap, AlertCircle, CheckCircle } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  sequence?: SequenceStep[];
  status: string;
}

interface SequenceStep {
  id: string;
  type: "email" | "delay";
  name: string;
  config: {
    subject?: string;
    prompt?: string;
    delayDays?: number;
  };
}

interface Lead {
  id: string;
  name: string;
  email: string;
  position?: string;
  company?: string;
  status?: string;
  requirement?: string;
  founder_linkedin?: string;
  website_url?: string;
  persona_insights?: any;
}

export function ManualSequenceSender({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [sendHistory, setSendHistory] = useState<any[]>([]);

  // Load campaign
  useEffect(() => {
    const loadCampaign = async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (!error && data) {
        setCampaign(data as any);
        if (data.sequence) {
          setSequenceSteps(data.sequence);
        }
      }
    };

    loadCampaign();
  }, [campaignId]);

  // Load leads for the campaign
  useEffect(() => {
    const loadLeads = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("name");

      if (!error && data) {
        setLeads(data as any);
      }
    };

    loadLeads();
  }, [campaignId]);

  // Load step details when selected
  const selectedStep = sequenceSteps.find(s => s.id === selectedStepId);

  const handleSendSequence = async () => {
    if (!selectedLeadId || !selectedStepId) {
      toast({
        title: "Missing selection",
        description: "Please select both a lead and a sequence step",
        variant: "destructive",
      });
      return;
    }

    const selectedLead = leads.find(l => l.id === selectedLeadId);
    if (!selectedLead) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // If custom body provided, use it directly; otherwise generate using AI with sequence prompt
      let emailSubject = customSubject || selectedStep?.config?.subject || "Follow-up";
      let emailBody = customBody;

      // If no custom body, generate email using AI with sequence prompt config
      if (!customBody) {
        console.log("🤖 Generating email from sequence prompt with persona data...");
        
        // Get company info for AI generation
        const { data: companyInfo } = await supabase
          .from("company_info")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Get AI provider settings
        const provider = localStorage.getItem("ai_provider") || "openai";
        const providerApiKey =
          provider === "openai"
            ? localStorage.getItem("openai_api_key") || undefined
            : provider === "claude"
              ? localStorage.getItem("claude_api_key") || undefined
              : undefined;

        // Call generate-email with sequence prompt and persona
        const { data: generatedData, error: genError } = await supabase.functions.invoke("generate-email", {
          body: {
            leadName: selectedLead.name,
            leadPosition: selectedLead.position,
            leadCompany: selectedLead.company,
            leadRequirement: selectedLead.requirement,
            leadLinkedIn: selectedLead.founder_linkedin,
            leadWebsite: selectedLead.website_url,
            tone: "professional",
            companyInfo: companyInfo || {},
            // CRITICAL: Pass sequence prompt config as campaign context
            campaignContext: selectedStep?.config?.prompt ? `Sequence Step: "${selectedStep.name}"\n\nPrompt Configuration:\n${selectedStep.config.prompt}` : undefined,
            // CRITICAL: Pass lead persona for pain-point-driven personalization
            leadPersona: selectedLead.persona_insights || undefined,
            provider,
            providerApiKey,
          },
        });

        if (genError) {
          console.error("Email generation error:", genError);
          throw new Error(`Failed to generate email: ${genError.message}`);
        }

        if (!generatedData?.subject || !generatedData?.body) {
          throw new Error("Invalid email generation response");
        }

        emailSubject = generatedData.subject;
        emailBody = generatedData.body;
        
        console.log("✅ Email generated successfully with persona data");
      }

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          leadId: selectedLead.id,
          toEmail: selectedLead.email,
          subject: emailSubject,
          body: emailBody,
          campaignId: campaignId,
          sequenceStepId: selectedStepId,
          sentManually: true,
        },
      });

      if (error) throw error;

      // Log the manual send
      await supabase.from("email_logs").insert({
        user_id: user.id,
        lead_id: selectedLead.id,
        campaign_id: campaignId,
        to_email: selectedLead.email,
        subject: emailSubject,
        body: emailBody,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      // Add to send history
      setSendHistory([
        {
          id: Math.random().toString(36).substr(2, 9),
          leadName: selectedLead.name,
          stepName: selectedStep?.name,
          subject: emailSubject,
          timestamp: new Date().toISOString(),
          status: "sent",
        },
        ...sendHistory,
      ]);

      toast({
        title: "Email sent successfully",
        description: `Sent "${emailSubject}" to ${selectedLead.name}`,
      });

      // Reset form
      setCustomSubject("");
      setCustomBody("");
      setSelectedLeadId("");
      setSelectedStepId("");
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Manual Sequence Sender
          </CardTitle>
          <CardDescription>
            Send specific sequence steps to individual leads manually, with automatic personalization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Step 1: Select Lead */}
          <div className="space-y-2">
            <Label htmlFor="lead">Lead</Label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger id="lead">
                <SelectValue placeholder="Select a lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} {lead.position ? `(${lead.position})` : ""}
                    <span className="text-xs text-muted-foreground ml-2">{lead.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leads.length === 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No leads found in this campaign
              </p>
            )}
          </div>

          {/* Step 2: Select Sequence Step */}
          {selectedLeadId && (
            <div className="space-y-2">
              <Label htmlFor="step">Sequence Step</Label>
              <Select value={selectedStepId} onValueChange={setSelectedStepId}>
                <SelectTrigger id="step">
                  <SelectValue placeholder="Select a sequence step..." />
                </SelectTrigger>
                <SelectContent>
                  {sequenceSteps.map(step => (
                    <SelectItem key={step.id} value={step.id}>
                      {step.name}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {step.type === "email" ? "📧 Email" : "⏳ Delay"}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Customize Email */}
          {selectedStepId && selectedStep?.type === "email" && (
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg border border-accent">
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <input
                  id="subject"
                  type="text"
                  placeholder={selectedStep.config?.subject || "Email subject..."}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email Body</Label>
                <Textarea
                  id="body"
                  placeholder={selectedStep.config?.prompt || "Email body (optional - will use sequence prompt if empty)..."}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to generate from step prompt: "{selectedStep.config?.prompt}"
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {selectedLeadId && selectedStepId && (
            <Button
              onClick={handleSendSequence}
              disabled={isSending}
              className="w-full"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Sequence Step"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Send History */}
      {sendHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sendHistory.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-3 bg-accent/30 rounded border border-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">{entry.leadName}</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.stepName}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{entry.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
