import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, RefreshCw, Send, Wand2, Users, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  position: string;
  requirement: string;
  email: string | null;
  founder_linkedin: string | null;
  website_url: string | null;
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
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("professional");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
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

    setIsGenerating(true);
    setSubject("");
    setBody("");

    try {
      // Get selected AI provider from settings
      const provider = localStorage.getItem('ai_provider') || 'lovable';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            leadName: selectedLead.name,
            leadPosition: selectedLead.position,
            leadRequirement: selectedLead.requirement,
            leadLinkedIn: selectedLead.founder_linkedin,
            leadWebsite: selectedLead.website_url,
            tone,
            companyInfo: companyInfo || {},
            provider, // Include selected AI provider
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate email");
      }

      const data = await response.json();
      setSubject(data.subject || "");
      setBody(data.body || "");

      toast({
        title: "Email generated",
        description: "Review and edit before sending",
      });
    } catch (error) {
      console.error("Generation error:", error);
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

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Replace placeholder with actual name
      const personalizedBody = body.replace(/\{\{name\}\}/gi, selectedLead.name.split(" ")[0]);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            to: selectedLead.email,
            subject,
            body: personalizedBody,
            leadId: selectedLead.id,
            userId: user.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      toast({
        title: "Email sent",
        description: `Email sent to ${selectedLead.email}`,
      });

      // Clear the form
      setSubject("");
      setBody("");
      setSelectedLeadId("");
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

        {/* Tone Selection */}
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company Info Status */}
        {!companyInfo?.company_name && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <p className="text-warning-foreground">
              💡 Add your company info in Settings for better personalization
            </p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedLeadId}
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
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="bg-secondary border-0 min-h-[180px] resize-none font-mono text-sm"
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
                className="flex-1 gap-2"
                onClick={handleSendEmail}
                disabled={isSending || !selectedLead?.email}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Email
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
