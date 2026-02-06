import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, Eye, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailLog {
  id: string;
  subject: string;
  body: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  error_message?: string;
}

interface EmailHistoryProps {
  leadId: string;
}

export function EmailHistory({ leadId }: EmailHistoryProps) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEmailHistory();
  }, [leadId]);

  const loadEmailHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch email logs for this lead
      const { data, error } = await supabase
        .from("email_logs")
        .select("id, subject, body, email_type, status, sent_at, opened_at, replied_at, error_message")
        .eq("lead_id", leadId)
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false });

      if (error) {
        // If email_type column doesn't exist yet, just fetch without it
        if (error.message?.includes("email_type")) {
          const { data: basicData, error: basicError } = await supabase
            .from("email_logs")
            .select("id, subject, body, status, sent_at, opened_at, replied_at, error_message")
            .eq("lead_id", leadId)
            .eq("user_id", user.id)
            .order("sent_at", { ascending: false });

          if (basicError) throw basicError;
          const processedData = (basicData || []).map((log: any) => ({
            ...log,
            email_type: "intro", // Default to intro if column doesn't exist
          }));
          setEmails(processedData);
        } else {
          throw error;
        }
      } else {
        setEmails(data as any || []);
      }
    } catch (error) {
      console.error("Error loading email history:", error);
      toast({
        title: "Error",
        description: "Failed to load email history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getEmailTypeLabel = (emailType: string) => {
    if (emailType === "intro") return "Intro Email";
    if (emailType.startsWith("follow_up")) {
      const num = emailType.replace("follow_up_", "");
      return `Follow-up #${num}`;
    }
    return emailType;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "failed":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading email history...</div>
        </CardContent>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">No emails sent to this lead yet</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          <div>
            <CardTitle>Email History</CardTitle>
            <CardDescription>
              All emails sent to this lead ({emails.length} total)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(email.status)}
                    <h4 className="font-semibold text-sm truncate">{email.subject}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {getEmailTypeLabel(email.email_type)}
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(email.status)}`}>
                      {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="mt-2 p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                <p className="line-clamp-2">{email.body.substring(0, 150)}...</p>
              </div>

              {/* Metadata */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {email.sent_at && (
                  <div>
                    <span className="font-semibold">Sent:</span>{" "}
                    {new Date(email.sent_at).toLocaleDateString()} at{" "}
                    {new Date(email.sent_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                {email.opened_at && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>
                      Opened: {new Date(email.opened_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {email.replied_at && (
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>
                      Replied: {new Date(email.replied_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {email.error_message && (
                  <div className="text-red-600 dark:text-red-400">
                    Error: {email.error_message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
