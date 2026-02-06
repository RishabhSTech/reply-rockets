import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, Star, Trash2, Search, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    industry?: string;
    category: "first_contact" | "follow_up" | "re_engagement" | "closing" | "custom";
    isShared?: boolean;
    isFavorite?: boolean;
    usageCount?: number;
    openRate?: number;
    clickRate?: number;
}

const INDUSTRY_PRESETS: Record<string, EmailTemplate[]> = {
    SaaS: [
        {
            id: "saas_1",
            name: "SaaS Product Integration",
            subject: "Quick question about {{company_name}}'s workflow",
            body: `Hi {{first_name}},

I noticed {{company_name}} is in the {{industry}} space. I've been helping similar companies at {{my_company}} reduce manual workflows by ~35%.

Would a 15-min chat make sense to see if we're a fit?

Best,
{{signature}}`,
            category: "first_contact",
            industry: "SaaS",
            usageCount: 342,
            openRate: 42,
        },
        {
            id: "saas_2",
            name: "SaaS Quick Follow-up",
            subject: "Missed you yesterday",
            body: `Hi {{first_name}},

Just wanted to follow up on my previous message. I know inboxes can get crazy.

If timing's not right, I completely understand. But if you see potential value, let me know.

{{action_link}}

Cheers,
{{signature}}`,
            category: "follow_up",
            industry: "SaaS",
            usageCount: 218,
            openRate: 38,
        },
    ],
    eCommerce: [
        {
            id: "ecom_1",
            name: "eCommerce Conversion Focus",
            subject: "{{company_name}} x {{my_company}}: +23% AOV in 60 days",
            body: `Hi {{first_name}},

Quick thought: {{company_name}} could see a meaningful lift in AOV using {{solution_name}}.

We've helped {{industry}} brands like you achieve:
• +{{metric1}}% increase in repeat purchases
• +{{metric2}}% improvement in basket size

Worth exploring?

{{cta}}

{{signature}}`,
            category: "first_contact",
            industry: "eCommerce",
            usageCount: 156,
            openRate: 48,
        },
    ],
    B2B: [
        {
            id: "b2b_1",
            name: "B2B Enterprise Touch",
            subject: "{{title}} at {{company_name}}: {{custom_insight}}",
            body: `Hi {{first_name}},

I've been following {{company_name}}'s growth in {{market_segment}} and think there could be a compelling fit.

We work with {{competitor_example}} to {{key_outcome}}.

Would you be open to a brief conversation?

{{meeting_link}}

{{signature}}`,
            category: "first_contact",
            industry: "B2B",
            usageCount: 289,
            openRate: 45,
        },
    ],
};

const TEMPLATE_CATEGORIES = {
    first_contact: "First Contact",
    follow_up: "Follow-up",
    re_engagement: "Re-engagement",
    closing: "Closing",
    custom: "Custom",
};

export function TemplateLibrary() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [openDialog, setOpenDialog] = useState(false);
    const [isAddingTemplate, setIsAddingTemplate] = useState(false);
    const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
        name: "",
        subject: "",
        body: "",
        category: "custom",
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        filterTemplates();
    }, [templates, searchQuery, selectedIndustry, selectedCategory]);

    const loadTemplates = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("email_templates")
                .select("*")
                .or(`user_id.eq.${user.id},is_shared.eq.true`)
                .order("usage_count", { ascending: false });

            if (error) throw error;

            // Combine with industry presets
            const allTemplates = [
                ...Object.values(INDUSTRY_PRESETS).flat(),
                ...(data || []),
            ];

            setTemplates(allTemplates);
        } catch (error) {
            console.error("Error loading templates:", error);
            // Fallback to presets
            setTemplates(Object.values(INDUSTRY_PRESETS).flat());
        } finally {
            setLoading(false);
        }
    };

    const filterTemplates = () => {
        let filtered = templates;

        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.subject.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedIndustry !== "all") {
            filtered = filtered.filter(t => t.industry === selectedIndustry);
        }

        if (selectedCategory !== "all") {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        setFilteredTemplates(filtered);
    };

    const handleAddTemplate = async () => {
        if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsAddingTemplate(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("email_templates")
                .insert({
                    user_id: user.id,
                    name: newTemplate.name,
                    subject: newTemplate.subject,
                    body: newTemplate.body,
                    category: newTemplate.category,
                    is_shared: false,
                });

            if (error) throw error;

            toast.success("Template created successfully");
            setNewTemplate({ name: "", subject: "", body: "", category: "custom" });
            loadTemplates();
            setOpenDialog(false);
        } catch (error) {
            console.error("Error adding template:", error);
            toast.error("Failed to create template");
        } finally {
            setIsAddingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        try {
            const { error } = await supabase
                .from("email_templates")
                .delete()
                .eq("id", templateId);

            if (error) throw error;

            toast.success("Template deleted");
            setTemplates(templates.filter(t => t.id !== templateId));
        } catch (error) {
            console.error("Error deleting template:", error);
            toast.error("Failed to delete template");
        }
    };

    const handleCopyTemplate = (template: EmailTemplate) => {
        const content = `Subject: ${template.subject}\n\n${template.body}`;
        navigator.clipboard.writeText(content);
        toast.success("Template copied to clipboard");
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Email Templates Library</h2>
                    <p className="text-muted-foreground mt-1">Pre-built industry-specific templates with performance analytics</p>
                </div>
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Create New Template</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input
                                    placeholder="e.g., SaaS Product Pitch"
                                    value={newTemplate.name || ""}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as any })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Subject Line</Label>
                                <Input
                                    placeholder="e.g., Quick question about {{company_name}}"
                                    value={newTemplate.subject || ""}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {{variable_name}} for personalization
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Email Body</Label>
                                <Textarea
                                    placeholder="Write your email template..."
                                    value={newTemplate.body || ""}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                                    className="min-h-[200px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Available variables: {{'{{'}}first_name{{'}'}}}, {{'{{'}}company_name{{'}'}}}, {{'{{'}}industry{{'}'}}}, {{'{{'}}signature{{'}}'}}
                                </p>
                            </div>
                            <Button onClick={handleAddTemplate} disabled={isAddingTemplate} className="w-full">
                                {isAddingTemplate ? "Creating..." : "Create Template"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter Controls */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        <SelectItem value="SaaS">SaaS</SelectItem>
                        <SelectItem value="eCommerce">eCommerce</SelectItem>
                        <SelectItem value="B2B">B2B</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Templates Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template) => (
                        <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <CardTitle className="text-base">{template.name}</CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            {TEMPLATE_CATEGORIES[template.category as keyof typeof TEMPLATE_CATEGORIES] || template.category}
                                        </CardDescription>
                                    </div>
                                    {template.isFavorite && <Star className="w-4 h-4 fill-primary text-primary flex-shrink-0" />}
                                </div>
                                {template.industry && (
                                    <Badge variant="secondary" className="w-fit text-xs">
                                        {template.industry}
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="bg-muted/50 rounded p-3 text-sm">
                                    <p className="font-medium mb-1">Subject:</p>
                                    <p className="text-xs line-clamp-2">{template.subject}</p>
                                </div>

                                {(template.usageCount || template.openRate) && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {template.usageCount && (
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3 text-muted-foreground" />
                                                <span>{template.usageCount} uses</span>
                                            </div>
                                        )}
                                        {template.openRate && (
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3 text-green-600" />
                                                <span>{template.openRate}% opens</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleCopyTemplate(template)}
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </Button>
                                    {!template.id.includes("_") && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteTemplate(template.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12">
                        <p className="text-muted-foreground">No templates found matching your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}
