import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Upload, FileText, Trash2, Loader2 } from "lucide-react";

interface CompanyInfo {
  id?: string;
  company_name: string;
  description: string;
  value_proposition: string;
  target_audience: string;
  key_benefits: string;
  context_json?: any;
}

interface UploadedDoc {
  name: string;
  path: string;
}

export function CompanyInfoSettings() {
  const [jsonInput, setJsonInput] = useState("");
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCompanyInfo();
    loadUploadedDocs();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("company_info")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyId(data.id);

        let displayJson = "";

        // Prioritize context_json if available (supports custom structure)
        if ((data as any).context_json) {
          displayJson = JSON.stringify((data as any).context_json, null, 2);
        } else {
          // Fallback to legacy fields
          const infoObj = {
            company_name: data.company_name || "",
            description: data.description || "",
            value_proposition: data.value_proposition || "",
            target_audience: data.target_audience || "",
            key_benefits: data.key_benefits || "",
          };
          displayJson = JSON.stringify(infoObj, null, 2);
        }

        setJsonInput(displayJson);
      } else {
        // Default template
        const defaultTemplate = {
          meta: {
            company_name: "",
            description: ""
          },
          // ... other structure
        };
        // Use the user's requested structure as the new default if they start fresh, 
        // or just keep the empty object. Let's keep a simple object for now but prepared for their structure.
        setJsonInput("{\n  \"company_name\": \"\"\n}");
      }
    } catch (error) {
      console.error("Error loading company info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUploadedDocs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.storage
        .from("company-docs")
        .list(user.id);

      if (error) throw error;

      if (data) {
        setUploadedDocs(data.map(file => ({
          name: file.name,
          path: `${user.id}/${file.name}`,
        })));
      }
    } catch (error) {
      console.error("Error loading docs:", error);
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setJsonError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setJsonError(null);

    try {
      // Validate JSON
      let parsedInfo;
      try {
        parsedInfo = JSON.parse(jsonInput);
      } catch (e) {
        setJsonError("Invalid JSON format. Please check your syntax.");
        setIsSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Attempt to extract legacy fields for backward compatibility if they exist in the JSON
      // Access deeply nested fields if the user is using the new structure
      const companyName = parsedInfo.company_name || parsedInfo.meta?.company_name || null;
      const description = parsedInfo.description || parsedInfo.meta?.description || null;
      // Other fields might not map directly, which is fine.

      const updatePayload = {
        context_json: parsedInfo, // Save the full JSON blob
        // Sync legacy columns if possible, but don't overwrite with null if we can avoid it? 
        // Actually, better to just sync what we can.
        company_name: companyName,
        description: description,
        // For other fields, if they don't exist at root, we might just leave them or set to null.
        // Let's rely on context_json for the new logic and just populate what we can.
        value_proposition: parsedInfo.value_proposition || null,
        target_audience: parsedInfo.target_audience || null,
        key_benefits: parsedInfo.key_benefits || null,
      };

      if (companyId) {
        const { error } = await supabase
          .from("company_info")
          .update(updatePayload)
          .eq("id", companyId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_info")
          .insert({
            user_id: user.id,
            ...updatePayload
          })
          .select()
          .single();

        if (error) throw error;
        setCompanyId(data.id);
      }

      toast({
        title: "Saved",
        description: "Company information updated successfully",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save. Make sure you ran the SQL migration to add 'context_json' column.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${file.name}`;
      const { error } = await supabase.storage
        .from("company-docs")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      setUploadedDocs(prev => [...prev, { name: file.name, path: filePath }]);
      toast({
        title: "Uploaded",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDoc = async (doc: UploadedDoc) => {
    try {
      const { error } = await supabase.storage
        .from("company-docs")
        .remove([doc.path]);

      if (error) throw error;

      setUploadedDocs(prev => prev.filter(d => d.path !== doc.path));
      toast({
        title: "Deleted",
        description: `${doc.name} removed`,
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Company Information (JSON)</CardTitle>
            <CardDescription>
              Edit your company context as JSON. This structure is used by AI to personalize emails.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="json-editor">JSON Context</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  const parsed = JSON.parse(jsonInput);
                  setJsonInput(JSON.stringify(parsed, null, 2));
                  setJsonError(null);
                } catch (e) {
                  setJsonError("Cannot format invalid JSON");
                }
              }}
              className="h-7 text-xs"
            >
              Format JSON
            </Button>
          </div>
          <Textarea
            id="json-editor"
            value={jsonInput}
            onChange={handleJsonChange}
            placeholder="{\n  'company_name': '...'\n}"
            className="min-h-[300px] font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
          {jsonError && (
            <p className="text-sm text-destructive font-medium">{jsonError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Minimum required: company_name (optional: additional context for AI personalization)
          </p>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <Label>Company Documents</Label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button variant="outline" size="sm" disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Doc
              </Button>
            </div>
          </div>

          {uploadedDocs.length > 0 ? (
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div key={doc.path} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDoc(doc)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Upload PDFs or docs about your company for richer AI context
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Company Info
        </Button>
      </CardContent>
    </Card>
  );
}
