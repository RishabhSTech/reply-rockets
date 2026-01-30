import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Mail, Lock, User, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function SmtpSettings() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [formData, setFormData] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    from_email: "",
    from_name: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setHasSettings(true);
      setIsVerified(data.is_verified);
      setFormData({
        host: data.host,
        port: data.port.toString(),
        username: data.username,
        password: data.password,
        from_email: data.from_email,
        from_name: data.from_name,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsVerified(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsData = {
        user_id: user.id,
        host: formData.host.trim(),
        port: parseInt(formData.port),
        username: formData.username.trim(),
        password: formData.password,
        from_email: formData.from_email.trim(),
        from_name: formData.from_name.trim(),
        is_verified: false,
      };

      if (hasSettings) {
        const { error } = await supabase
          .from("smtp_settings")
          .update(settingsData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("smtp_settings")
          .insert(settingsData);
        if (error) throw error;
        setHasSettings(true);
      }

      toast.success("SMTP settings saved!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await supabase.functions.invoke("test-smtp", {
        body: {
          host: formData.host,
          port: parseInt(formData.port),
          username: formData.username,
          password: formData.password,
          from_email: formData.from_email,
        },
      });

      if (response.error) throw new Error(response.error.message);

      // Update verified status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("smtp_settings")
          .update({ is_verified: true })
          .eq("user_id", user.id);
      }

      setIsVerified(true);
      toast.success("SMTP connection verified!");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify SMTP connection");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>SMTP Settings</CardTitle>
              <CardDescription>Configure your email server for sending outreach</CardDescription>
            </div>
          </div>
          {isVerified && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host *</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="host"
                  name="host"
                  placeholder="smtp.gmail.com"
                  value={formData.host}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port *</Label>
              <Input
                id="port"
                name="port"
                type="number"
                placeholder="587"
                value={formData.port}
                onChange={handleChange}
                className="bg-secondary border-0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  placeholder="your@email.com"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-secondary border-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="from_email"
                  name="from_email"
                  type="email"
                  placeholder="outreach@company.com"
                  value={formData.from_email}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_name">From Name *</Label>
              <Input
                id="from_name"
                name="from_name"
                placeholder="John from Company"
                value={formData.from_name}
                onChange={handleChange}
                className="bg-secondary border-0"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="outline" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
            <Button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.host || !formData.password}
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
