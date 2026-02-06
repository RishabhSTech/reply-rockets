import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Trash2, Code2, Eye, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomField {
    id: string;
    name: string;
    label: string;
    type: "text" | "number" | "email" | "url" | "select" | "multiselect";
    required: boolean;
    options?: string[]; // For select/multiselect
    defaultValue?: string;
}

interface PersonalizationVariable {
    name: string;
    placeholder: string;
    example: string;
    category: "builtin" | "custom";
}

const BUILTIN_VARIABLES: PersonalizationVariable[] = [
    { name: "{{first_name}}", placeholder: "first_name", example: "John", category: "builtin" },
    { name: "{{last_name}}", placeholder: "last_name", example: "Doe", category: "builtin" },
    { name: "{{company_name}}", placeholder: "company_name", example: "Acme Corp", category: "builtin" },
    { name: "{{industry}}", placeholder: "industry", example: "SaaS", category: "builtin" },
    { name: "{{title}}", placeholder: "title", example: "VP of Sales", category: "builtin" },
    { name: "{{email}}", placeholder: "email", example: "john@acme.com", category: "builtin" },
    { name: "{{company_website}}", placeholder: "company_website", example: "acme.com", category: "builtin" },
    { name: "{{pain_point}}", placeholder: "pain_point", example: "Sales cycle optimization", category: "builtin" },
    { name: "{{icebreaker}}", placeholder: "icebreaker", example: "Recently hired 50 engineers", category: "builtin" },
];

export function CustomFieldsManager() {
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newField, setNewField] = useState<Partial<CustomField>>({
        name: "",
        label: "",
        type: "text",
        required: false,
        options: [],
    });

    useEffect(() => {
        loadCustomFields();
    }, []);

    const loadCustomFields = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("custom_fields")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setCustomFields(data || []);
        } catch (error) {
            console.error("Error loading custom fields:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = async () => {
        if (!newField.name || !newField.label) {
            toast.error("Please fill in all required fields");
            return;
        }

        // Validate field name format
        if (!/^[a-z_]+$/.test(newField.name)) {
            toast.error("Field name must be lowercase with underscores only");
            return;
        }

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("custom_fields")
                .insert({
                    user_id: user.id,
                    name: newField.name,
                    label: newField.label,
                    type: newField.type,
                    required: newField.required,
                    options: newField.options?.filter(o => o.trim()),
                    default_value: newField.defaultValue,
                });

            if (error) throw error;

            toast.success("Custom field created");
            setNewField({ name: "", label: "", type: "text", required: false, options: [] });
            loadCustomFields();
            setOpenDialog(false);
        } catch (error) {
            console.error("Error adding field:", error);
            toast.error("Failed to create custom field");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteField = async (fieldId: string) => {
        try {
            const { error } = await supabase
                .from("custom_fields")
                .delete()
                .eq("id", fieldId);

            if (error) throw error;

            toast.success("Field deleted");
            setCustomFields(customFields.filter(f => f.id !== fieldId));
        } catch (error) {
            console.error("Error deleting field:", error);
            toast.error("Failed to delete field");
        }
    };

    const allVariables: PersonalizationVariable[] = [
        ...BUILTIN_VARIABLES,
        ...customFields.map(f => ({
            name: `{{${f.name}}}`,
            placeholder: f.name,
            example: `${f.label} value`,
            category: "custom" as const,
        })),
    ];

    if (loading) {
        return <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded" />)}
        </div>;
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="personalization" className="w-full">
                <TabsList>
                    <TabsTrigger value="personalization">Personalization Variables</TabsTrigger>
                    <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
                    <TabsTrigger value="syntax">Liquid Syntax</TabsTrigger>
                </TabsList>

                {/* Personalization Variables Tab */}
                <TabsContent value="personalization" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-semibold">Available Variables</h3>
                            <p className="text-sm text-muted-foreground">
                                Use these variables in your email templates for automatic personalization
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {/* Built-in Variables */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground">Standard Variables</h4>
                            <div className="grid gap-2 md:grid-cols-2">
                                {BUILTIN_VARIABLES.map((variable) => (
                                    <Card key={variable.name} className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 space-y-1">
                                                <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                                                    {variable.name}
                                                </code>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Example: <strong>{variable.example}</strong>
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(variable.name);
                                                    toast.success("Copied!");
                                                }}
                                            >
                                                📋
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Custom Variables */}
                        {customFields.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="text-sm font-medium text-muted-foreground">Your Custom Variables</h4>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {customFields.map((field) => (
                                        <Card key={field.id} className="p-3 border-primary/20">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 space-y-1">
                                                    <code className="text-sm font-mono bg-primary/10 px-2 py-1 rounded inline-block">
                                                        {`{{${field.name}}}`}
                                                    </code>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {field.label}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`{{${field.name}}}`);
                                                        toast.success("Copied!");
                                                    }}
                                                >
                                                    📋
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Custom Fields Tab */}
                <TabsContent value="custom-fields" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-semibold">Custom Lead Fields</h3>
                            <p className="text-sm text-muted-foreground">
                                Define custom data fields to store on each lead
                            </p>
                        </div>
                        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Field
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create Custom Field</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Field Name *</Label>
                                        <Input
                                            placeholder="e.g., estimated_budget (lowercase, underscores)"
                                            value={newField.name || ""}
                                            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Used in templates as {{'{{'}}estimated_budget{{'}}'}}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Display Label *</Label>
                                        <Input
                                            placeholder="e.g., Estimated Budget"
                                            value={newField.label || ""}
                                            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Field Type</Label>
                                        <Select value={newField.type} onValueChange={(value) => setNewField({ ...newField, type: value as any })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="number">Number</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="url">URL</SelectItem>
                                                <SelectItem value="select">Dropdown</SelectItem>
                                                <SelectItem value="multiselect">Multi-select</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(newField.type === "select" || newField.type === "multiselect") && (
                                        <div className="space-y-2">
                                            <Label>Options (one per line)</Label>
                                            <textarea
                                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                                value={(newField.options || []).join("\n")}
                                                onChange={(e) => setNewField({ ...newField, options: e.target.value.split("\n").filter(o => o.trim()) })}
                                                className="w-full border rounded p-2 min-h-[100px]"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Default Value (optional)</Label>
                                        <Input
                                            placeholder="Leave empty for no default"
                                            value={newField.defaultValue || ""}
                                            onChange={(e) => setNewField({ ...newField, defaultValue: e.target.value })}
                                        />
                                    </div>

                                    <Button onClick={handleAddField} disabled={isSaving} className="w-full">
                                        {isSaving ? "Creating..." : "Create Field"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {customFields.length > 0 ? (
                        <div className="grid gap-3">
                            {customFields.map((field) => (
                                <Card key={field.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base">{field.label}</CardTitle>
                                                <code className="text-xs text-muted-foreground mt-1">{{`{{${field.name}}}`}}</code>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteField(field.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{field.type}</Badge>
                                            {field.required && <Badge variant="outline">Required</Badge>}
                                            {field.defaultValue && <Badge variant="outline">Default: {field.defaultValue}</Badge>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center text-muted-foreground">
                            <p>No custom fields yet. Create one to add more personalization options.</p>
                        </Card>
                    )}
                </TabsContent>

                {/* Liquid Syntax Tab */}
                <TabsContent value="syntax" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Code2 className="w-4 h-4" />
                                Advanced Template Syntax
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <h4 className="font-medium">Basic Variables</h4>
                                <div className="bg-muted p-4 rounded font-mono text-sm space-y-2">
                                    <div className="text-muted-foreground">
                                        Hi {'{{first_name}}'}, I noticed you work at {'{{company_name}}'}.
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium">Conditional Logic</h4>
                                <div className="bg-muted p-4 rounded font-mono text-sm space-y-2">
                                    <div>
                                        {`{% if pain_point contains "scaling" %}`}<br/>
                                        &nbsp;&nbsp;{'I noticed you\'re struggling with scaling...'}<br/>
                                        {`{% endif %}`}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Show different content based on lead attributes or pain points
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium">Loops</h4>
                                <div className="bg-muted p-4 rounded font-mono text-sm space-y-2">
                                    <div>
                                        {`{% for item in products %}`}<br/>
                                        &nbsp;&nbsp;- {'{{'}}item{{'}'}} <br/>
                                        {`{% endfor %}`}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Iterate through lists of data
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium">Filters</h4>
                                <div className="bg-muted p-4 rounded font-mono text-sm space-y-2">
                                    <div className="text-muted-foreground">
                                        {'{{ first_name | upcase }}'} - Convert to uppercase<br/>
                                        {'{{ name | downcase }'} - Convert to lowercase<br/>
                                        {'{{ email | split: "@" | first }}'} - Extract part before @
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-4 space-y-2">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                    Liquid Syntax Reference
                                </p>
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    For advanced template logic, we use Liquid template syntax. Variables must exist in your custom fields or built-in variables.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
