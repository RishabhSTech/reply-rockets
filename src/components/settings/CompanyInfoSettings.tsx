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
}

interface UploadedDoc {
  name: string;
  path: string;
}

export function CompanyInfoSettings() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    company_name: "",
    description: "",
    value_proposition: "",
    target_audience: "",
    key_benefits: "",
  });
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
        setCompanyInfo({
          id: data.id,
          company_name: data.company_name || "",
          description: data.description || "",
          value_proposition: data.value_proposition || "",
          target_audience: data.target_audience || "",
          key_benefits: data.key_benefits || "",
        });
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (companyInfo.id) {
        const { error } = await supabase
          .from("company_info")
          .update({
            company_name: companyInfo.company_name,
            description: companyInfo.description,
            value_proposition: companyInfo.value_proposition,
            target_audience: companyInfo.target_audience,
            key_benefits: companyInfo.key_benefits,
          })
          .eq("id", companyInfo.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_info")
          .insert({
            user_id: user.id,
            company_name: companyInfo.company_name,
            description: companyInfo.description,
            value_proposition: companyInfo.value_proposition,
            target_audience: companyInfo.target_audience,
            key_benefits: companyInfo.key_benefits,
          })
          .select()
          .single();

        if (error) throw error;
        setCompanyInfo(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Saved",
        description: "Company information updated successfully",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save company information",
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
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This context helps AI generate personalized emails about your business
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={companyInfo.company_name}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, company_name: e.target.value }))}
            placeholder="Your company name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">What We Do</Label>
          <Textarea
            id="description"
            value={companyInfo.description}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Briefly describe what your company does..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="value-prop">Value Proposition</Label>
          <Textarea
            id="value-prop"
            value={companyInfo.value_proposition}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, value_proposition: e.target.value }))}
            placeholder="What unique value do you provide to customers?"
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target Audience</Label>
          <Input
            id="target"
            value={companyInfo.target_audience}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, target_audience: e.target.value }))}
            placeholder="e.g., B2B SaaS companies, Series A-C startups"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="benefits">Key Benefits</Label>
          <Textarea
            id="benefits"
            value={companyInfo.key_benefits}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, key_benefits: e.target.value }))}
            placeholder="List 2-3 key benefits (e.g., 3x more meetings, 50% faster ramp-up)"
            className="min-h-[60px]"
          />
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
