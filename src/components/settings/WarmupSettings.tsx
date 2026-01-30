import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, TrendingUp, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function WarmupSettings() {
  const [loading, setLoading] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const [formData, setFormData] = useState({
    enabled: true,
    current_daily_limit: 5,
    max_daily_limit: 50,
    ramp_up_rate: 2,
    send_window_start: 9,
    send_window_end: 17,
    timezone: "UTC",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("warmup_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setHasSettings(true);
      setFormData({
        enabled: data.enabled,
        current_daily_limit: data.current_daily_limit,
        max_daily_limit: data.max_daily_limit,
        ramp_up_rate: data.ramp_up_rate,
        send_window_start: data.send_window_start,
        send_window_end: data.send_window_end,
        timezone: data.timezone,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsData = {
        user_id: user.id,
        ...formData,
      };

      if (hasSettings) {
        const { error } = await supabase
          .from("warmup_settings")
          .update(settingsData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("warmup_settings")
          .insert(settingsData);
        if (error) throw error;
        setHasSettings(true);
      }

      toast.success("Warmup settings saved!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const daysToMaxCapacity = Math.ceil(
    (formData.max_daily_limit - formData.current_daily_limit) / formData.ramp_up_rate
  );

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle>Email Warmup</CardTitle>
              <CardDescription>Gradually increase sending volume to build reputation</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="warmup-enabled" className="text-sm text-muted-foreground">
              {formData.enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="warmup-enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Volume Ramp-up Section */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volume Ramp-up
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_daily_limit">Current Daily Limit</Label>
                <Input
                  id="current_daily_limit"
                  type="number"
                  min={1}
                  max={formData.max_daily_limit}
                  value={formData.current_daily_limit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      current_daily_limit: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="bg-background border-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_daily_limit">Max Daily Limit</Label>
                <Input
                  id="max_daily_limit"
                  type="number"
                  min={formData.current_daily_limit}
                  max={500}
                  value={formData.max_daily_limit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_daily_limit: parseInt(e.target.value) || 50,
                    }))
                  }
                  className="bg-background border-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ramp_up_rate">Daily Increase</Label>
                <Input
                  id="ramp_up_rate"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.ramp_up_rate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ramp_up_rate: parseInt(e.target.value) || 2,
                    }))
                  }
                  className="bg-background border-0"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              At this rate, you'll reach max capacity in{" "}
              <span className="font-medium text-foreground">{daysToMaxCapacity} days</span>
            </p>
          </div>

          {/* Send Window Section */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="w-4 h-4 text-primary" />
              Send Window
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Send between</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.send_window_start}:00 - {formData.send_window_end}:00
                  </span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[formData.send_window_start, formData.send_window_end]}
                    onValueChange={([start, end]) =>
                      setFormData((prev) => ({
                        ...prev,
                        send_window_start: start,
                        send_window_end: end,
                      }))
                    }
                    min={0}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, timezone: value }))
                  }
                >
                  <SelectTrigger className="bg-background border-0">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Warmup Settings"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
