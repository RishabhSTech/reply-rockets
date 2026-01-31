import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, RefreshCw, Mail, Linkedin, Globe, User, Briefcase } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  position: string;
  requirement: string;
  email: string | null;
  founder_linkedin: string | null;
  website_url: string | null;
  persona_insights?: any;
  created_at: string;
}

interface EmailPreview {
  subject: string;
  body: string;
}

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [isPreviewingEmail, setIsPreviewingEmail] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [tone, setTone] = useState("professional");

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const loadLead = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (error) {
      console.error("Error loading lead:", error);
      toast({
        title: "Error",
        description: "Failed to load lead details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePersona = async () => {
    if (!lead) return;

    setIsGeneratingPersona(true);
    try {
      const provider = localStorage.getItem("ai_provider") || "openai";
      const providerApiKey =
        provider === "openai"
          ? localStorage.getItem("openai_api_key") || undefined
          : provider === "claude"
            ? localStorage.getItem("claude_api_key") || undefined
            : undefined;

      if ((provider === "openai" || provider === "claude") && !providerApiKey) {
        toast({
          title: "Missing API key",
          description: "Please add your API key in Settings",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-persona", {
        body: {
          leadName: lead.name,
          leadPosition: lead.position,
          founderLinkedIn: lead.founder_linkedin,
          websiteUrl: lead.website_url,
          provider,
          providerApiKey,
        },
      });

      if (error) {
        console.error("Persona generation error:", error);
        throw new Error(error.message || "Failed to generate persona");
      }

      if (!data?.persona) {
        throw new Error("No persona data returned from AI");
      }

      // Update lead with persona insights
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          persona_insights: data.persona,
          persona_generated_at: new Date().toISOString(),
        } as any)
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Update local state
      setLead({
        ...lead,
        persona_insights: data.persona,
      });

      toast({
        title: "Success",
        description: "Persona generated successfully",
      });
    } catch (error) {
      console.error("Error generating persona:", error);
      toast({
        title: "Error",
        description: "Failed to generate persona",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const generateEmailPreview = async () => {
    if (!lead) return;

    setIsPreviewingEmail(true);
    try {
      const { data: companyInfo } = await supabase
        .from("company_info")
        .select("*")
        .maybeSingle();

      const provider = localStorage.getItem("ai_provider") || "openai";
      const providerApiKey =
        provider === "openai"
          ? localStorage.getItem("openai_api_key") || undefined
          : provider === "claude"
            ? localStorage.getItem("claude_api_key") || undefined
            : undefined;

      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          leadName: lead.name,
          leadPosition: lead.position,
          leadRequirement: lead.requirement,
          leadLinkedIn: lead.founder_linkedin,
          leadWebsite: lead.website_url,
          tone,
          companyInfo: companyInfo || {},
          provider,
          providerApiKey,
        },
      });

      if (error) throw error;

      setEmailPreview(data);
      toast({
        title: "Success",
        description: "Email preview generated",
      });
    } catch (error) {
      console.error("Error generating email preview:", error);
      toast({
        title: "Error",
        description: "Failed to generate email preview",
        variant: "destructive",
      });
    } finally {
      setIsPreviewingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <p>Lead not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{lead.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span>{lead.position}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="persona">Persona</TabsTrigger>
          <TabsTrigger value="email-preview">Email Preview</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{lead.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-semibold">{lead.position}</p>
                </div>
                {lead.email && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                    <a href={`mailto:${lead.email}`} className="font-semibold text-primary hover:underline">
                      {lead.email}
                    </a>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Challenge</p>
                <p className="font-semibold">{lead.requirement}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {lead.founder_linkedin && (
                  <a
                    href={lead.founder_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {lead.website_url && (
                  <a
                    href={lead.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Persona Tab */}
        <TabsContent value="persona" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Professional Persona</CardTitle>
                <CardDescription>
                  AI-generated insights based on LinkedIn & website
                </CardDescription>
              </div>
              <Button
                onClick={generatePersona}
                disabled={isGeneratingPersona || (!lead.founder_linkedin && !lead.website_url)}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isGeneratingPersona ? "animate-spin" : ""}`} />
                {isGeneratingPersona ? "Generating..." : "Generate"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {lead.persona_insights ? (
                <>
                  {lead.persona_insights.title && (
                    <div>
                      <p className="text-sm text-muted-foreground">Professional Title</p>
                      <p className="text-lg font-semibold">{lead.persona_insights.title}</p>
                    </div>
                  )}

                  {lead.persona_insights.painPoints && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Pain Points</p>
                      <div className="space-y-2">
                        {lead.persona_insights.painPoints.map(
                          (point: string, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-red-500/10 text-sm text-red-700"
                            >
                              {point}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {lead.persona_insights.priorities && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Priorities</p>
                      <div className="space-y-2">
                        {lead.persona_insights.priorities.map(
                          (priority: string, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-blue-500/10 text-sm text-blue-700"
                            >
                              {priority}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {lead.persona_insights.icebreakerHooks && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Icebreaker Hooks</p>
                      <div className="space-y-2">
                        {lead.persona_insights.icebreakerHooks.map(
                          (hook: string, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-amber-500/10 text-sm text-amber-700"
                            >
                              "{hook}"
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {lead.persona_insights.keyTakeaways && (
                    <div>
                      <p className="text-sm text-muted-foreground">Key Takeaways</p>
                      <p className="text-sm">{lead.persona_insights.keyTakeaways}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-lg bg-muted text-center">
                  <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No persona generated yet. Click "Generate" to create one.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Preview Tab */}
        <TabsContent value="email-preview" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  Preview personalized email before sending
                </CardDescription>
              </div>
              <Button
                onClick={generateEmailPreview}
                disabled={isPreviewingEmail}
                className="gap-2"
              >
                <Loader2 className={`w-4 h-4 ${isPreviewingEmail ? "animate-spin" : ""}`} />
                {isPreviewingEmail ? "Generating..." : "Generate"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-lg border bg-background"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              {emailPreview && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subject</p>
                    <div className="mt-2 p-3 rounded-lg bg-muted">
                      <p className="font-semibold">{emailPreview.subject}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Body</p>
                    <div className="mt-2 p-3 rounded-lg bg-muted max-h-96 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{emailPreview.body}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
