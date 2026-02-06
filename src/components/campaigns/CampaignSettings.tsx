import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, Globe, Code } from "lucide-react";

interface CampaignSettingsProps {
    campaignId: string;
}

export function CampaignSettings({ campaignId }: CampaignSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [jsonLoading, setJsonLoading] = useState(true);
    const [promptJson, setPromptJson] = useState<string>("");
    const [jsonError, setJsonError] = useState<string>("");
    const [settings, setSettings] = useState({
        dailyLimit: 50,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "UTC",
        days: {
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: false,
            sun: false
        }
    });

    // Load campaign prompt_json on mount
    useEffect(() => {
        const loadCampaignJson = async () => {
            try {
                const { data, error } = await supabase
                    .from("campaigns")
                    .select("prompt_json")
                    .eq("id", campaignId)
                    .single();

                if (error) throw error;

                if (data?.prompt_json) {
                    const jsonStr = typeof data.prompt_json === 'string'
                        ? data.prompt_json
                        : JSON.stringify(data.prompt_json, null, 2);
                    setPromptJson(jsonStr);
                }
            } catch (error) {
                console.error("Error loading campaign JSON:", error);
                toast.error("Failed to load campaign settings");
            } finally {
                setJsonLoading(false);
            }
        };

        loadCampaignJson();
    }, [campaignId]);

    // Mock loading existing settings - in real app would fetch from DB
    // For now we just use state, maybe save to a 'settings' jsonb column in campaign

    const handleJsonChange = (value: string) => {
        setPromptJson(value);
        // Real-time validation
        if (value.trim()) {
            try {
                JSON.parse(value);
                setJsonError("");
            } catch (error: any) {
                setJsonError(error.message);
            }
        } else {
            setJsonError("");
        }
    };

    const handleSave = async () => {
        // Validate JSON before saving
        if (promptJson.trim()) {
            try {
                JSON.parse(promptJson);
                setJsonError("");
            } catch (error) {
                setJsonError("Invalid JSON format");
                toast.error("Invalid JSON format - please fix errors before saving");
                return;
            }
        }

        setLoading(true);
        try {
            // Parse the JSON to save it properly
            let jsonToSave: any = null;
            if (promptJson.trim()) {
                jsonToSave = JSON.parse(promptJson);
            }

            const { error } = await supabase
                .from("campaigns")
                .update({
                    prompt_json: jsonToSave
                })
                .eq("id", campaignId);

            if (error) throw error;

            toast.success("Campaign settings saved");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    const days = [
        { key: "mon", label: "Mon" },
        { key: "tue", label: "Tue" },
        { key: "wed", label: "Wed" },
        { key: "thu", label: "Thu" },
        { key: "fri", label: "Fri" },
        { key: "sat", label: "Sat" },
        { key: "sun", label: "Sun" },
    ];

    return (
        <div className="space-y-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Sending Schedule
                    </CardTitle>
                    <CardDescription>
                        Configure when emails should be sent to leads
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Timezone</Label>
                            <div className="flex items-center gap-2 border rounded-md px-3 h-10 bg-muted/50">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                <Select
                                    value={settings.timezone}
                                    onValueChange={(val) => setSettings({ ...settings, timezone: val })}
                                >
                                    <SelectTrigger className="border-0 bg-transparent h-9 p-0 focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                                        <SelectItem value="EST">EST (New York)</SelectItem>
                                        <SelectItem value="PST">PST (Los Angeles)</SelectItem>
                                        <SelectItem value="GMT">GMT (London)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="time"
                                    value={settings.startTime}
                                    onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    value={settings.endTime}
                                    onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Sending Days</Label>
                        <div className="flex gap-2 flex-wrap">
                            {days.map(day => (
                                <div
                                    key={day.key}
                                    onClick={() => setSettings({
                                        ...settings,
                                        days: { ...settings.days, [day.key]: !settings.days[day.key as keyof typeof settings.days] }
                                    })}
                                    className={`
                            w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all border
                            ${settings.days[day.key as keyof typeof settings.days]
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted text-muted-foreground border-transparent hover:border-border"}
                        `}
                                >
                                    <span className="text-sm font-medium">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sending Limits & Safety</CardTitle>
                    <CardDescription>
                        Control the volume of emails to protect your domain reputation
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Max Emails Per Day</Label>
                                <p className="text-sm text-muted-foreground">Maximum total emails sent from this campaign daily</p>
                            </div>
                            <Input
                                type="number"
                                className="w-24 text-right"
                                value={settings.dailyLimit}
                                onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="space-y-0.5">
                                <Label>Stop on Reply</Label>
                                <p className="text-sm text-muted-foreground">Automatically remove leads from sequence when they reply</p>
                            </div>
                            <Switch checked={true} disabled />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        Email Prompt Configuration
                    </CardTitle>
                    <CardDescription>
                        Define your company voice and email generation rules in JSON format
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {jsonLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading campaign configuration...
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="prompt-json">Campaign Prompt JSON</Label>
                                <Textarea
                                    id="prompt-json"
                                    placeholder='Enter JSON configuration (e.g., {"voice": "professional", "tone": "friendly", ...})'
                                    value={promptJson}
                                    onChange={(e) => handleJsonChange(e.target.value)}
                                    className={`font-mono text-sm min-h-48 ${jsonError ? "border-destructive" : ""}`}
                                />
                                {jsonError && (
                                    <p className="text-sm text-destructive">
                                        ⚠️ JSON Error: {jsonError}
                                    </p>
                                )}
                                {!jsonError && promptJson.trim() && (
                                    <p className="text-sm text-green-600">
                                        ✓ Valid JSON
                                    </p>
                                )}
                            </div>
                            <div className="bg-muted/50 p-3 rounded-md text-sm">
                                <p className="font-semibold mb-2">Example:</p>
                                <pre className="whitespace-pre-wrap text-xs overflow-x-auto">{`{
  "voice": "professional yet approachable",
  "company_type": "B2B SaaS",
  "main_message": "Help companies scale engineering teams",
  "forbidden_phrases": ["offshore", "body shop"],
  "tone_guidelines": "Peer-to-peer, solution-focused"
}`}</pre>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button size="lg" onClick={handleSave} disabled={loading || jsonError !== ""}>
                    {loading ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
        </div>
    );
}
