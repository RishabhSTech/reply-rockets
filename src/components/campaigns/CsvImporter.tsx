import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, File, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CsvImporterProps {
    campaignId: string;
    onImportComplete: () => void;
}

export function CsvImporter({ campaignId, onImportComplete }: CsvImporterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<{ processed: number; success: number } | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
            setStats(null);
        }
    }, []);

    const sanitizeValue = (value: string) => {
        const trimmed = value.trim();
        // Prevent CSV injection (formula injection)
        if (['=', '+', '-', '@'].some(char => trimmed.startsWith(char))) {
            return "'" + trimmed;
        }
        return trimmed;
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        // Handle potential empty lines at header
        const headerLine = lines.find(l => l.trim().length > 0);
        if (!headerLine) throw new Error("CSV file is empty");

        const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

        // Required fields mapping
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const companyIdx = headers.findIndex(h => h.includes('company'));
        const positionIdx = headers.findIndex(h => h.includes('title') || h.includes('position') || h.includes('role'));
        const linkedInIdx = headers.findIndex(h => h.includes('linkedin'));
        const websiteIdx = headers.findIndex(h => h.includes('website') || h.includes('url'));

        if (emailIdx === -1) {
            throw new Error("CSV must contain an 'email' column");
        }

        // Simple regex for email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return lines.slice(lines.indexOf(headerLine) + 1)
            .filter(line => line.trim() !== '')
            .map(line => {
                // Determine if we need to handle quotes (basic check)
                // This is still a basic parser; for production a library like PapaParse is recommended
                const values = line.split(',');

                const email = sanitizeValue(values[emailIdx] || '');

                return {
                    email: email,
                    name: sanitizeValue(nameIdx !== -1 ? values[nameIdx] || 'Unknown' : 'Unknown'),
                    position: sanitizeValue(positionIdx !== -1 ? values[positionIdx] || '' : ''),
                    requirement: '', // Default requirement
                    founder_linkedin: linkedInIdx !== -1 ? sanitizeValue(values[linkedInIdx] || '') : null,
                    website_url: websiteIdx !== -1 ? sanitizeValue(values[websiteIdx] || '') : null,
                    status: 'pending',
                };
            })
            .filter(row => row.email && emailRegex.test(row.email));
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const leads = parseCSV(text);

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not authenticated");

                // Prepare data for insertion with campaign_id
                const leadsToInsert = leads.map(lead => ({
                    ...lead,
                    user_id: user.id,
                    campaign_id: campaignId,
                }));

                const { error: insertError } = await supabase
                    .from("leads")
                    .insert(leadsToInsert);

                if (insertError) throw insertError;

                setStats({
                    processed: leads.length,
                    success: leads.length
                });

                toast.success(`Successfully imported ${leads.length} leads`);
                onImportComplete();
                setTimeout(() => setIsOpen(false), 2000);

            } catch (err: any) {
                console.error("Import error:", err);
                setError(err.message || "Failed to process CSV file");
                toast.error("Import failed");
            } finally {
                setUploading(false);
            }
        };

        reader.readAsText(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Leads from CSV</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0];
                                if (selectedFile) {
                                    setFile(selectedFile);
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
                                    <Button variant="ghost" size="sm" onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setStats(null);
                                    }}>Remove</Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Click to select CSV file</p>
                                    <p className="text-xs">or drag & drop</p>
                                    <p className="text-xs pt-2 text-muted-foreground/70">Required: email column</p>
                                </div>
                            )}
                        </label>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {stats && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-4 w-4" />
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>
                                Imported {stats.success} leads successfully.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={!file || uploading || !!stats}>
                        {uploading ? "Importing..." : "Import Leads"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
