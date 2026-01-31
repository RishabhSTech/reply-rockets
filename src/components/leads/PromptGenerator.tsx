import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";

interface PromptGeneratorProps {
  leadId: string;
  leadProfile: any;
}

const PROMPTS = [
  {
    id: "icp_qualifier",
    name: "ICP Qualifier",
    description: "Assess if company is a strong ICP fit",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "website", label: "Website", type: "url", required: true },
    ],
  },
  {
    id: "company_role_research",
    name: "Company & Role Research",
    description: "Research company and role before outreach",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "website", label: "Website", type: "url", required: true },
      { name: "job_roles", label: "Job role(s) open", type: "text", required: true },
      { name: "recipient_role", label: "Recipient role", type: "text", required: true },
    ],
  },
  {
    id: "email_1_conversation_starter",
    name: "Email 1 - Conversation Starter",
    description: "Write first outbound email",
    fields: [
      { name: "company_name", label: "Company", type: "text", required: true },
      { name: "hiring_signal", label: "Hiring signal", type: "text", required: true },
      { name: "recipient_name", label: "Recipient name", type: "text", required: true },
      { name: "recipient_role", label: "Recipient role", type: "text", required: true },
      { name: "industry", label: "Industry", type: "text", required: true },
      { name: "country", label: "Country", type: "text", required: true },
    ],
  },
  {
    id: "persona_insights",
    name: "Persona Building",
    description: "Build detailed persona insights",
    fields: [
      { name: "lead_name", label: "Lead name", type: "text", required: true },
      { name: "lead_role", label: "Lead role", type: "text", required: true },
      { name: "company_name", label: "Company name", type: "text", required: true },
      {
        name: "company_stage",
        label: "Company stage",
        type: "select",
        options: ["Pre-seed", "Seed", "Series A", "Series B+", "Profitable", "Enterprise"],
        required: true,
      },
      {
        name: "lead_background",
        label: "Lead background (if known)",
        type: "textarea",
        required: false,
      },
    ],
  },
];

export function PromptGenerator({ leadId, leadProfile }: PromptGeneratorProps) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedPrompts, setCompletedPrompts] = useState<Set<string>>(new Set());

  const currentPrompt = PROMPTS[currentPromptIndex];

  const handleInputChange = (fieldName: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleOutputChange = (outputName: string, value: string) => {
    setOutputs((prev) => ({
      ...prev,
      [outputName]: value,
    }));
  };

  const generatePrompt = async () => {
    // Check if all required fields are filled
    const missingFields = currentPrompt.fields
      .filter((f) => f.required && !inputs[f.name])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill: ${missingFields.join(", ")}`);
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build the user prompt by replacing placeholders
      let userPrompt = getPromptTemplate(currentPrompt.id).userPrompt;
      currentPrompt.fields.forEach((field) => {
        userPrompt = userPrompt.replace(`{${field.name}}`, inputs[field.name] || "");
      });

      // Call AI to generate outputs
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          systemPrompt: getPromptTemplate(currentPrompt.id).systemPrompt,
          userPrompt: userPrompt,
          leadName: leadProfile?.name || "Unknown",
          leadPosition: leadProfile?.position || "",
          leadCompany: leadProfile?.company || "",
        },
      });

      if (error) throw error;

      // Parse the generated output
      // The response should contain the generated fields
      const generatedOutputs: Record<string, string> = {};
      
      if (currentPrompt.id === "icp_qualifier") {
        generatedOutputs.is_icp_fit = data?.is_icp_fit || "";
        generatedOutputs.icp_reasoning = data?.icp_reasoning || "";
        generatedOutputs.hiring_signal = data?.hiring_signal || "";
        generatedOutputs.best_persona = data?.best_persona || "";
      } else if (currentPrompt.id === "company_role_research") {
        generatedOutputs.company_description = data?.company_description || "";
        generatedOutputs.hiring_reason = data?.hiring_reason || "";
        generatedOutputs.ownership_pressure = data?.ownership_pressure || "";
        generatedOutputs.recipient_concerns = data?.recipient_concerns || "";
      } else if (currentPrompt.id === "email_1_conversation_starter") {
        generatedOutputs.subject_line = data?.subject_line || "";
        generatedOutputs.email_body = data?.email_body || "";
      } else if (currentPrompt.id === "persona_insights") {
        generatedOutputs.persona_primary_pain = data?.persona_primary_pain || "";
        generatedOutputs.persona_motivation = data?.persona_motivation || "";
        generatedOutputs.persona_priority = data?.persona_priority || "";
        generatedOutputs.persona_objection = data?.persona_objection || "";
      }

      setOutputs(generatedOutputs);
      toast.success("Generated successfully! Review and edit if needed.");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAndContinue = async () => {
    if (Object.keys(outputs).length === 0) {
      toast.error("Please generate or fill outputs first");
      return;
    }

    try {
      // Save the outputs to the lead profile
      const updateData: any = {
        persona_insights: {
          ...leadProfile?.persona_insights || {},
          [currentPrompt.id]: outputs,
        },
      };

      // Also save individual fields if they match specific names
      if (currentPrompt.id === "persona_insights") {
        updateData.persona_insights = {
          ...updateData.persona_insights,
          primary_pain: outputs.persona_primary_pain,
          motivation: outputs.persona_motivation,
          priority: outputs.persona_priority,
          objection: outputs.persona_objection,
        };
      }

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) throw error;

      const newCompleted = new Set(completedPrompts);
      newCompleted.add(currentPrompt.id);
      setCompletedPrompts(newCompleted);

      toast.success(`${currentPrompt.name} saved!`);

      // Move to next prompt
      if (currentPromptIndex < PROMPTS.length - 1) {
        setCurrentPromptIndex(currentPromptIndex + 1);
        setInputs({});
        setOutputs({});
      } else {
        toast.success("All prompts completed! 🎉");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save");
    }
  };

  const goToPrevious = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(currentPromptIndex - 1);
      setInputs({});
      setOutputs({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex gap-2">
        {PROMPTS.map((prompt, index) => (
          <div key={prompt.id} className="flex items-center gap-2">
            <Button
              variant={index === currentPromptIndex ? "default" : "outline"}
              size="sm"
              className="w-10 h-10 p-0"
              onClick={() => {
                setCurrentPromptIndex(index);
                setInputs({});
                setOutputs({});
              }}
            >
              {completedPrompts.has(prompt.id) ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </Button>
            {index < PROMPTS.length - 1 && (
              <div className="w-2 h-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Current Prompt Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{currentPrompt.name}</CardTitle>
              <CardDescription>{currentPrompt.description}</CardDescription>
            </div>
            <Badge variant="outline">
              {currentPromptIndex + 1} of {PROMPTS.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Input Information</h3>
            {currentPrompt.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.type === "text" && (
                  <Input
                    id={field.name}
                    placeholder={field.label}
                    value={inputs[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}

                {field.type === "url" && (
                  <Input
                    id={field.name}
                    type="url"
                    placeholder="https://"
                    value={inputs[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}

                {field.type === "textarea" && (
                  <Textarea
                    id={field.name}
                    placeholder={field.label}
                    value={inputs[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    rows={3}
                  />
                )}

                {field.type === "select" && (
                  <Select value={inputs[field.name] || ""} onValueChange={(value) => handleInputChange(field.name, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={field.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <Button
            onClick={generatePrompt}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate with AI"
            )}
          </Button>

          {/* Output Section */}
          {Object.keys(outputs).length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm">Generated Output (Review & Edit)</h3>
              {Object.entries(outputs).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`output-${key}`}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                  <Textarea
                    id={`output-${key}`}
                    value={value}
                    onChange={(e) => handleOutputChange(key, e.target.value)}
                    rows={4}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentPromptIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setCurrentPromptIndex(currentPromptIndex + 1);
                setInputs({});
                setOutputs({});
              }}
              disabled={currentPromptIndex === PROMPTS.length - 1}
              className="ml-auto"
            >
              Skip
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>

            <Button
              onClick={saveAndContinue}
              disabled={Object.keys(outputs).length === 0}
            >
              Save & Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getPromptTemplate(promptId: string) {
  const templates: Record<string, any> = {
    icp_qualifier: {
      systemPrompt: "You are a CMO qualifying outbound leads. Answer the following questions clearly about the company:",
      userPrompt: "Company name: {company_name}\nWebsite: {website}\n\nAnswer:\n1) Is this company a strong ICP fit for Shrijan Tech? (Yes or No)\n2) Why or why not (1–2 sentences only)\n3) What hiring or growth signal makes this relevant?\n4) Best persona to contact first (Founder, COO, Director, CTO, VP Engineering)",
    },
    company_role_research: {
      systemPrompt: "You are an AI SDR researching a company before outreach. Do not assume internal chaos. Speak in patterns, not facts.",
      userPrompt: "Company name: {company_name}\nWebsite: {website}\nJob role(s) open: {job_roles}\nRecipient role: {recipient_role}\n\nDo the following:\n1) Describe what the company does in one simple sentence\n2) Explain why companies at this stage usually hire this role\n3) Identify one delivery or ownership pressure common at this stage\n4) Explain what someone in this recipient's role likely worries about",
    },
    email_1_conversation_starter: {
      systemPrompt: "You are an elite AI SDR writing the first outbound email to start a conversation. Rules: Include a subject line. Reference the hiring signal naturally. Explain why teams usually hire here using common patterns. Share one clear point of view about delivery or ownership. End with a diagnostic question. Do NOT ask for a call. No em dashes. No bullets. Short paragraphs only. End exactly with: Thanks, Emily Carter",
      userPrompt: "Context:\nCompany: {company_name}\nHiring signal: {hiring_signal}\nRecipient name: {recipient_name}\nRecipient role: {recipient_role}\nIndustry: {industry}\nCountry: {country}\n\nWrite the first email as described in the rules.",
    },
    persona_insights: {
      systemPrompt: "You are an expert at building buyer personas. Based on the lead's role and company context, infer realistic pain points, motivations, and concerns. Be specific but not presumptive.",
      userPrompt: "Build persona insights for:\nLead name: {lead_name}\nLead role: {lead_role}\nCompany: {company_name}\nCompany stage: {company_stage}\nBackground: {lead_background}\n\nProvide:\n1) Primary pain point for someone in this role\n2) Key motivation/goal at this company stage\n3) Current priority\n4) Likely objection or concern",
    },
  };

  return templates[promptId] || { systemPrompt: "", userPrompt: "" };
}
