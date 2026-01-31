import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Eye, MousePointer, Reply, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignActivityProps {
  campaignId: string;
}

interface Activity {
  id: string;
  type: "sent" | "opened" | "clicked" | "replied";
  leadName: string;
  leadEmail: string;
  timestamp: string;
  subject?: string;
  preview?: string;
}

const activityIcons = {
  sent: { Icon: Mail, color: "text-blue-500", bg: "bg-blue-50" },
  opened: { Icon: Eye, color: "text-green-500", bg: "bg-green-50" },
  clicked: { Icon: MousePointer, color: "text-orange-500", bg: "bg-orange-50" },
  replied: { Icon: Reply, color: "text-purple-500", bg: "bg-purple-50" },
};

const activityLabels = {
  sent: "Email sent to",
  opened: "Email opened by",
  clicked: "Link clicked by",
  replied: "Reply from",
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
};

export function CampaignActivity({ campaignId }: CampaignActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    // Set up real-time subscription
    const emailLogsSubscription = supabase
      .channel(`campaign_activities_${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_logs",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      emailLogsSubscription.unsubscribe();
    };
  }, [campaignId]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Fetch email logs for this campaign
      const { data: emailLogs, error: emailError } = await supabase
        .from("email_logs")
        .select(`
          id,
          lead_id,
          subject,
          body,
          sent_at,
          opened_at,
          clicked_at,
          leads (
            id,
            name,
            email
          )
        `)
        .eq("campaign_id", campaignId)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (emailError) throw emailError;

      // Fetch email replies for this campaign
      const { data: emailReplies, error: repliesError } = await supabase
        .from("email_replies")
        .select(`
          id,
          lead_id,
          subject,
          body,
          received_at,
          from_name,
          leads (
            id,
            name,
            email
          ),
          email_logs (
            campaign_id
          )
        `)
        .order("received_at", { ascending: false })
        .limit(50);

      if (repliesError) throw repliesError;

      const allActivities: Activity[] = [];

      // Process email logs
      if (emailLogs) {
        emailLogs.forEach((log: any) => {
          // Sent email
          if (log.sent_at) {
            allActivities.push({
              id: `sent-${log.id}`,
              type: "sent",
              leadName: log.leads?.name || "Unknown",
              leadEmail: log.leads?.email || "",
              timestamp: log.sent_at,
              subject: log.subject,
              preview: log.body?.substring(0, 80),
            });
          }

          // Opened email
          if (log.opened_at) {
            allActivities.push({
              id: `opened-${log.id}`,
              type: "opened",
              leadName: log.leads?.name || "Unknown",
              leadEmail: log.leads?.email || "",
              timestamp: log.opened_at,
              subject: log.subject,
            });
          }

          // Clicked link
          if (log.clicked_at) {
            allActivities.push({
              id: `clicked-${log.id}`,
              type: "clicked",
              leadName: log.leads?.name || "Unknown",
              leadEmail: log.leads?.email || "",
              timestamp: log.clicked_at,
              subject: log.subject,
            });
          }
        });
      }

      // Process email replies
      if (emailReplies) {
        emailReplies
          .filter((reply: any) => reply.email_logs?.campaign_id === campaignId)
          .forEach((reply: any) => {
            allActivities.push({
              id: `replied-${reply.id}`,
              type: "replied",
              leadName: reply.leads?.name || "Unknown",
              leadEmail: reply.leads?.email || "",
              timestamp: reply.received_at,
              subject: reply.subject,
              preview: reply.body?.substring(0, 80),
            });
          });
      }

      // Sort by timestamp, newest first
      allActivities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          {activities.length === 0
            ? "No activity yet"
            : `${activities.length} event${activities.length !== 1 ? "s" : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No activity yet. Send emails to see activity here.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const { Icon, color, bg } = activityIcons[activity.type];
              const label = activityLabels[activity.type];
              const timeAgo = formatTimeAgo(new Date(activity.timestamp));

              return (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50"
                  )}
                >
                  <div className={cn("rounded-full p-2 flex-shrink-0", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{activity.leadName}</p>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>

                    {activity.subject && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Subject: {activity.subject}
                      </p>
                    )}

                    {activity.preview && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {activity.preview}...
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
