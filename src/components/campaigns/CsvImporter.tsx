import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, File, AlertCircle, Check, ChevronRight, Settings2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ColumnMapping {
    csvColumn: string;
    leadField: string;
}

interface CsvImporterProps {
    campaignId: string;
    onImportComplete: () => void;
}

interface ParsedCSVData {
    headers: string[];
    rows: Record<string, string>[];
}

export function CsvImporter({ campaignId, onImportComplete }: CsvImporterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<"upload" | "mapping" | "complete">("upload");
    const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<{ processed: number; success: number } | null>(null);
    const [customFields, setCustomFields] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadCustomFields();
        }
    }, [isOpen]);

    const loadCustomFields = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("custom_fields")
                .select("name")
                .eq("user_id", user.id);

            if (error) throw error;
            setCustomFields((data || []).map(f => f.name));
        } catch (error) {
            console.error("Error loading custom fields:", error);
        }
    };

    const STANDARD_FIELDS = [
        { value: "email", label: "Email *" },
        { value: "name", label: "Name" },
        { value: "position", label: "Position / Title" },
        { value: "company", label: "Company" },
        { value: "phone", label: "Phone" },
        { value: "founder_linkedin", label: "LinkedIn Profile" },
        { value: "website_url", label: "Website URL" },
        { value: "requirement", label: "Notes / Requirements" },
        ...customFields.map(f => ({ value: f, label: `Custom: ${f}` })),
    ];

    const sanitizeValue = (value: string) => {
        const trimmed = value.trim();
        if (['=', '+', '-', '@'].some(char => trimmed.startsWith(char))) {
            return "'" + trimmed;
        }
        return trimmed;
    };

    const parseCSV = (text: string): ParsedCSVData => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length === 0) throw new Error("CSV file is empty");

        const headerLine = lines[0];
        const headers = headerLine
            .split(',')
            .map(h => h.trim())
            .map(h => h.replace(/^["']|["']$/g, ''));

        const rows: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => sanitizeValue(v));
            const row: Record<string, string> = {};

            headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
            });

            rows.push(row);
        }

        return { headers, rows };
    };

    const handleFileSelect = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const parsed = parseCSV(text);

                setParsedData(parsed);

                // Auto-detect mappings
                const autoMappings: ColumnMapping[] = parsed.headers.map(header => {
                    const lowerHeader = header.toLowerCase();
                    let matchedField = "requirement"; // Default

                    if (lowerHeader.includes("email")) matchedField = "email";
                    else if (lowerHeader.includes("name")) matchedField = "name";
                    else if (
                        lowerHeader.includes("title") ||
                        lowerHeader.includes("position") ||
                        lowerHeader.includes("role")
                    ) matchedField = "position";
                    else if (lowerHeader.includes("company")) matchedField = "company";
                    else if (lowerHeader.includes("phone")) matchedField = "phone";
                    else if (lowerHeader.includes("linkedin")) matchedField = "founder_linkedin";
                    else if (
                        lowerHeader.includes("website") ||
                        lowerHeader.includes("url") ||
                        lowerHeader.includes("site")
                    ) matchedField = "website_url";

                    return { csvColumn: header, leadField: matchedField };
                });

                setColumnMappings(autoMappings);
                setStep("mapping");
            } catch (err: any) {
                setError(err.message || "Failed to parse CSV");
                toast.error("CSV parsing failed");
            } finally {
                setUploading(false);
            }
        };

        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!parsedData) return;

        // Validate email column is mapped
        if (!columnMappings.find(m => m.leadField === "email")) {
            toast.error("Email column must be mapped");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            const leadsToInsert = parsedData.rows
                .map(row => {
                    const lead: any = {
                        user_id: user.id,
                        campaign_id: campaignId,
                    };

                    columnMappings.forEach(mapping => {
                        const value = row[mapping.csvColumn];
                        if (value && mapping.leadField) {
                            lead[mapping.leadField] = value;
                        }
                    });

                    return lead;
                })
                .filter(lead => {
                    // Must have email and valid email format
                    return lead.email && emailRegex.test(lead.email);
                });

            if (leadsToInsert.length === 0) {
                throw new Error("No valid leads found. Check that email column is properly mapped.");
            }

            const { error: insertError } = await supabase
                .from("leads")
                .insert(leadsToInsert);

            if (insertError) throw insertError;

            setStats({
                processed: parsedData.rows.length,
                success: leadsToInsert.length
            });

            toast.success(`Successfully imported ${leadsToInsert.length} leads`);
            setStep("complete");
            onImportComplete();

            setTimeout(() => {
                setIsOpen(false);
                setStep("upload");
                setFile(null);
                setParsedData(null);
                setColumnMappings([]);
                setStats(null);
            }, 1500);

        } catch (err: any) {
            console.error("Import error:", err);
            setError(err.message || "Failed to import leads");
            toast.error("Import failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Leads from CSV</DialogTitle>
                </DialogHeader>

                <Tabs value={step} className="w-full">
                    {/* Step 1: Upload */}
                    <TabsContent value="upload" className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) {
                                        setFile(selectedFile);
                                        setError(null);
                                    }
                                }}
                                className="hidden"
                                id="csv-input"
                            />
                            <label htmlFor="csv-input" className="cursor-pointer block">
                                {file ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                                            <File className="w-5 h-5" />
                                        </div>
                                        <div className="text-sm font-medium">{file.name}</div>
                                        <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                        <Upload className="w-8 h-8 mb-2 opacity-50" />
                                        <p className="text-sm font-medium">Click to select CSV file</p>
                                        <p className="text-xs">or drag & drop</p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3 text-xs text-blue-900 dark:text-blue-100">
                            <p><strong>Required:</strong> Email column</p>
                            <p className="mt-1"><strong>Optional:</strong> Name, Position, Company, LinkedIn, Website, Custom Fields</p>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={handleFileSelect} disabled={!file || uploading}>
                                {uploading ? "Processing..." : "Next: Map Columns"}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Step 2: Column Mapping */}
                    <TabsContent value="mapping" className="space-y-4">
                        <div className="space-y-2 mb-4">
                            <h3 className="font-medium flex items-center gap-2">
                                <Settings2 className="w-4 h-4" />
                                Map CSV Columns to Lead Fields
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Preview: {parsedData?.rows.length || 0} rows found
                            </p>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {columnMappings.map((mapping, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{mapping.csvColumn}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Example: {parsedData?.rows[0]?.[mapping.csvColumn]?.substring(0, 30)}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    <Select
                                        value={mapping.leadField}
                                        onValueChange={(value) => {
                                            const newMappings = [...columnMappings];
                                            newMappings[idx].leadField = value;
                                            setColumnMappings(newMappings);
                                        }}
                                    >
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Skip this column</SelectItem>
                                            {STANDARD_FIELDS.map(field => (
                                                <SelectItem key={field.value} value={field.value}>
                                                    {field.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                            <Button onClick={handleImport} disabled={uploading}>
                                {uploading ? "Importing..." : "Import Leads"}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Step 3: Complete */}
                    <TabsContent value="complete" className="space-y-4 text-center py-8">
                        <div className="flex justify-center mb-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                                <Check className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Import Complete!</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                Successfully imported {stats?.success} of {stats?.processed} leads
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
