import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, Globe } from "lucide-react";

interface CampaignSettingsProps {
    campaignId: string;
}

export function CampaignSettings({ campaignId }: CampaignSettingsProps) {
    const [loading, setLoading] = useState(false);
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

    // Mock loading existing settings - in real app would fetch from DB
    // For now we just use state, maybe save to a 'settings' jsonb column in campaign

    const handleSave = async () => {
        setLoading(true);
        try {
            // Assuming we're saving to a generic 'settings' jsonb column or specific cols
            // For this demo, we'll pretend to save to 'daily_limit' and 'schedule' jsonb

            /* 
            const { error } = await supabase
              .from("campaigns")
              .update({ 
                   daily_limit: settings.dailyLimit,
                   schedule: settings 
              })
              .eq("id", campaignId);
            */

            // Simulating save
            await new Promise(resolve => setTimeout(resolve, 800));

            toast.success("Campaign settings saved");
        } catch (error) {
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

            <div className="flex justify-end">
                <Button size="lg" onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
        </div>
    );
}
