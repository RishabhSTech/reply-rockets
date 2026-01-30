import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mail, Reply, Calendar, MousePointer, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Activity {
  id: string;
  type: "sent" | "opened" | "clicked" | "replied" | "meeting";
  lead: string;
  campaign: string;
  time: string;
}

const activityIcons = {
  sent: Mail,
  opened: Eye,
  clicked: MousePointer,
  replied: Reply,
  meeting: Calendar,
};

const activityStyles = {
  sent: "bg-muted text-muted-foreground",
  opened: "bg-primary/10 text-primary",
  clicked: "bg-warning/10 text-warning",
  replied: "bg-success/10 text-success",
  meeting: "bg-accent/10 text-accent",
};

const activityLabels = {
  sent: "Email sent to",
  opened: "Email opened by",
  clicked: "Link clicked by",
  replied: "Reply from",
  meeting: "Meeting booked with",
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      // Fetch recent emails, replies, and meetings
      const [
        { data: emails },
        { data: replies },
        { data: meetings },
      ] = await Promise.all([
        supabase
          .from("email_logs")
          .select("*, leads(name), campaigns(name)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("email_replies")
          .select("*, leads(name)")
          .order("received_at", { ascending: false })
          .limit(10),
        supabase
          .from("meetings")
          .select("*, leads(name)")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const allActivities: Activity[] = [];

      // Process sent emails
      emails?.forEach((email: any) => {
        if (email.status === "sent" && email.sent_at) {
          allActivities.push({
            id: `sent-${email.id}`,
            type: "sent",
            lead: email.leads?.name || email.to_email,
            campaign: email.campaigns?.name || "Direct Email",
            time: formatTimeAgo(new Date(email.sent_at)),
          });
        }
        if (email.opened_at) {
          allActivities.push({
            id: `opened-${email.id}`,
            type: "opened",
            lead: email.leads?.name || email.to_email,
            campaign: email.campaigns?.name || "Direct Email",
            time: formatTimeAgo(new Date(email.opened_at)),
          });
        }
        if (email.clicked_at) {
          allActivities.push({
            id: `clicked-${email.id}`,
            type: "clicked",
            lead: email.leads?.name || email.to_email,
            campaign: email.campaigns?.name || "Direct Email",
            time: formatTimeAgo(new Date(email.clicked_at)),
          });
        }
      });

      // Process replies
      replies?.forEach((reply: any) => {
        allActivities.push({
          id: `replied-${reply.id}`,
          type: "replied",
          lead: reply.from_name || reply.leads?.name || reply.from_email,
          campaign: "Inbox",
          time: formatTimeAgo(new Date(reply.received_at)),
        });
      });

      // Process meetings
      meetings?.forEach((meeting: any) => {
        allActivities.push({
          id: `meeting-${meeting.id}`,
          type: "meeting",
          lead: meeting.leads?.name || "Unknown",
          campaign: meeting.title,
          time: formatTimeAgo(new Date(meeting.created_at)),
        });
      });

      // Sort by time (most recent first) and take top 5
      allActivities.sort((a, b) => {
        const getMinutes = (time: string) => {
          if (time === "just now") return 0;
          const match = time.match(/(\d+)/);
          const num = match ? parseInt(match[1]) : 0;
          if (time.includes("min")) return num;
          if (time.includes("hour")) return num * 60;
          if (time.includes("day")) return num * 60 * 24;
          return 0;
        };
        return getMinutes(a.time) - getMinutes(b.time);
      });

      setActivities(allActivities.slice(0, 5));
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border animate-pulse">
        <div className="p-5 border-b border-border">
          <div className="h-5 bg-muted rounded w-32 mb-2" />
          <div className="h-4 bg-muted rounded w-48" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border animate-slide-up">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live updates from your campaigns
        </p>
      </div>

      <div className="divide-y divide-border">
        {activities.length > 0 ? (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-4 hover:bg-secondary/30 transition-colors"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                    activityStyles[activity.type]
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">
                      {activityLabels[activity.type]}
                    </span>{" "}
                    <span className="font-medium">{activity.lead}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.campaign} • {activity.time}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Send your first email to see activity here</p>
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => navigate("/analytics")}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
}
