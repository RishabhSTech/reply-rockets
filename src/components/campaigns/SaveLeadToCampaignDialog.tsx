import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Briefcase, Linkedin, Globe, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SaveLeadToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onLeadAdded: () => void;
}

export function SaveLeadToCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  onLeadAdded,
}: SaveLeadToCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    requirement: "",
    founder_linkedin: "",
    website_url: "",
    email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const saveLead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        campaign_id: campaignId,
        name: formData.name.trim(),
        position: formData.position.trim(),
        requirement: formData.requirement.trim(),
        founder_linkedin: formData.founder_linkedin.trim() || null,
        website_url: formData.website_url.trim() || null,
        email: formData.email.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate persona in background if LinkedIn or website provided (don't block)
    if (data && (formData.founder_linkedin || formData.website_url)) {
      const provider = localStorage.getItem("ai_provider") || "openai";
      const providerApiKey =
        provider === "openai"
          ? localStorage.getItem("openai_api_key") || undefined
          : provider === "claude"
            ? localStorage.getItem("claude_api_key") || undefined
            : undefined;

      // Only generate if we have an API key for non-lovable providers
      if (provider === "lovable" || providerApiKey) {
        supabase.functions
          .invoke("generate-persona", {
            body: {
              leadName: formData.name.trim(),
              leadPosition: formData.position.trim(),
              founderLinkedIn: formData.founder_linkedin.trim() || undefined,
              websiteUrl: formData.website_url.trim() || undefined,
              provider,
              providerApiKey,
            },
          })
          .then(async (res) => {
            console.log("Persona response:", res);

            // Check for Supabase function-level errors
            if (res.error) {
              console.error("Persona generation invoke error:", res.error);
              toast.error(`Persona generation failed: ${res.error.message}`);
              return;
            }

            // Check for API-level errors in the response data
            if (res.data?.error) {
              console.error("Persona generation API error:", res.data.error);
              toast.error(`Persona generation failed: ${res.data.error}`);
              return;
            }

            if (res.data?.persona) {
              await supabase
                .from("leads")
                .update({
                  persona_insights: res.data.persona,
                  persona_generated_at: new Date().toISOString(),
                } as any)
                .eq("id", data.id);
              toast.success("Persona generated successfully!");
            } else {
              console.warn("No persona data in response:", res.data);
            }
          })
          .catch((err) => {
            console.error("Background persona generation failed:", err);
            toast.error(`Persona generation failed: ${err.message}`);
          });
      }
    }

    return data;
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.position.trim() || !formData.requirement.trim()) {
      toast.error("Please fill in required fields: Name, Position, and Requirement");
      return;
    }

    setLoading(true);

    try {
      await saveLead();
      toast.success("Lead saved and added to campaign!");
      setFormData({
        name: "",
        position: "",
        requirement: "",
        founder_linkedin: "",
        website_url: "",
        email: "",
      });
      onLeadAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Lead to Campaign</DialogTitle>
          <DialogDescription>
            Create and add a new lead directly to this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="position"
                  name="position"
                  placeholder="VP of Sales"
                  value={formData.position}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirement">Requirement (1 line) *</Label>
            <Textarea
              id="requirement"
              name="requirement"
              placeholder="Looking to scale outbound sales without hiring more SDRs..."
              value={formData.requirement}
              onChange={handleChange}
              className="bg-secondary border-0 min-h-[60px] resize-none"
              required
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.requirement.length}/200
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="founder_linkedin">Founder LinkedIn</Label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="founder_linkedin"
                  name="founder_linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.founder_linkedin}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="website_url"
                  name="website_url"
                  type="url"
                  placeholder="https://company.com"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10 bg-secondary border-0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Lead"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
