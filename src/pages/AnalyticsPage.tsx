import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { TrendingUp, TrendingDown, Mail, Users, Reply, Calendar, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface AnalyticsData {
  totalEmailsSent: number;
  totalLeads: number;
  repliedLeads: number;
  meetingsBooked: number;
  replyRate: number;
  // Week-over-week changes
  emailsChange: number;
  leadsChange: number;
  replyRateChange: number;
  meetingsChange: number;
}

interface LeadStatus {
  status: string;
  name: string;
  position: string;
}

const AnalyticsPage = () => {
  const [currentPath, setCurrentPath] = useState("/analytics");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topLeads, setTopLeads] = useState<LeadStatus[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ day: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadAnalytics();
      }
    });
  }, [navigate]);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);

      // Get current period data
      const [emailsResult, leadsResult, repliesResult] = await Promise.all([
        supabase
          .from("email_logs")
          .select("*", { count: "exact" })
          .eq("status", "sent"),
        supabase
          .from("leads")
          .select("*"),
        supabase
          .from("email_replies")
          .select("*", { count: "exact" }),
      ]);

      const emails = emailsResult.data || [];
      const leads = leadsResult.data || [];
      const replies = repliesResult.data || [];

      // Calculate current metrics
      const totalEmailsSent = emails.length;
      const totalLeads = leads.length;
      const repliedLeads = leads.filter(l => l.status === "replied").length;
      const meetingsBooked = leads.filter(l => l.status === "meeting").length;
      const replyRate = totalLeads > 0 ? (repliedLeads / totalLeads) * 100 : 0;

      // Get emails from last week vs previous week for comparison
      const lastWeekEmails = emails.filter(e => 
        new Date(e.sent_at || e.created_at) >= weekAgo
      ).length;
      const prevWeekEmails = emails.filter(e => {
        const date = new Date(e.sent_at || e.created_at);
        return date >= twoWeeksAgo && date < weekAgo;
      }).length;

      const lastWeekLeads = leads.filter(l => 
        new Date(l.created_at) >= weekAgo
      ).length;
      const prevWeekLeads = leads.filter(l => {
        const date = new Date(l.created_at);
        return date >= twoWeeksAgo && date < weekAgo;
      }).length;

      // Calculate changes
      const emailsChange = prevWeekEmails > 0 
        ? ((lastWeekEmails - prevWeekEmails) / prevWeekEmails) * 100 
        : lastWeekEmails > 0 ? 100 : 0;
      const leadsChange = prevWeekLeads > 0 
        ? ((lastWeekLeads - prevWeekLeads) / prevWeekLeads) * 100 
        : lastWeekLeads > 0 ? 100 : 0;

      setAnalytics({
        totalEmailsSent,
        totalLeads,
        repliedLeads,
        meetingsBooked,
        replyRate,
        emailsChange,
        leadsChange,
        replyRateChange: 0, // Would need historical data
        meetingsChange: 0,
      });

      // Get top leads by status
      const topLeadsByActivity = leads
        .filter(l => l.status !== "pending")
        .slice(0, 5)
        .map(l => ({
          status: l.status,
          name: l.name,
          position: l.position,
        }));
      setTopLeads(topLeadsByActivity);

      // Get daily email activity for last 7 days
      const dailyActivity: { [key: string]: number } = {};
      for (let i = 6; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStr = format(day, "EEE");
        dailyActivity[dayStr] = 0;
      }

      emails.forEach(email => {
        const emailDate = new Date(email.sent_at || email.created_at);
        if (emailDate >= weekAgo) {
          const dayStr = format(emailDate, "EEE");
          if (dailyActivity[dayStr] !== undefined) {
            dailyActivity[dayStr]++;
          }
        }
      });

      setRecentActivity(
        Object.entries(dailyActivity).map(([day, count]) => ({ day, count }))
      );

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    navigate(path);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const metrics = analytics ? [
    {
      title: "Total Emails Sent",
      value: analytics.totalEmailsSent.toLocaleString(),
      change: formatChange(analytics.emailsChange),
      trend: analytics.emailsChange >= 0 ? "up" : "down",
      icon: Mail,
    },
    {
      title: "Active Leads",
      value: analytics.totalLeads.toLocaleString(),
      change: formatChange(analytics.leadsChange),
      trend: analytics.leadsChange >= 0 ? "up" : "down",
      icon: Users,
    },
    {
      title: "Reply Rate",
      value: `${analytics.replyRate.toFixed(1)}%`,
      change: formatChange(analytics.replyRateChange),
      trend: analytics.replyRateChange >= 0 ? "up" : "down",
      icon: Reply,
    },
    {
      title: "Meetings Booked",
      value: analytics.meetingsBooked.toString(),
      change: formatChange(analytics.meetingsChange),
      trend: analytics.meetingsChange >= 0 ? "up" : "down",
      icon: Calendar,
    },
  ] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "replied": return "text-green-600";
      case "meeting": return "text-blue-600";
      case "contacted": return "text-yellow-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Analytics" 
          onNewCampaign={() => navigate("/leads")} 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric) => (
                  <Card key={metric.title}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <metric.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${
                          metric.trend === "up" ? "text-green-600" : "text-red-600"
                        }`}>
                          {metric.trend === "up" ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {metric.change}
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-bold">{metric.value}</p>
                        <p className="text-sm text-muted-foreground">{metric.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Chart */}
              <PerformanceChart />

              {/* Additional Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topLeads.length > 0 ? (
                      <div className="space-y-4">
                        {topLeads.map((lead, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{lead.name}</span>
                              <p className="text-xs text-muted-foreground">{lead.position}</p>
                            </div>
                            <span className={`text-sm font-medium capitalize ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No lead activity yet. Add leads and start sending emails.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Email Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.some(a => a.count > 0) ? (
                      <div className="space-y-3">
                        {recentActivity.map((activity, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-10">{activity.day}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min(100, (activity.count / Math.max(...recentActivity.map(a => a.count), 1)) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{activity.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No emails sent in the last 7 days.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{analytics?.repliedLeads || 0}</p>
                      <p className="text-sm text-muted-foreground">Replies Received</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">
                        {analytics && analytics.totalLeads > 0 
                          ? `${((analytics.repliedLeads / analytics.totalLeads) * 100).toFixed(0)}%`
                          : "0%"}
                      </p>
                      <p className="text-sm text-muted-foreground">Response Rate</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">
                        {analytics && analytics.totalEmailsSent > 0 && analytics.totalLeads > 0
                          ? (analytics.totalEmailsSent / analytics.totalLeads).toFixed(1)
                          : "0"}
                      </p>
                      <p className="text-sm text-muted-foreground">Emails per Lead</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">
                        {analytics && analytics.meetingsBooked > 0 && analytics.totalLeads > 0
                          ? `${((analytics.meetingsBooked / analytics.totalLeads) * 100).toFixed(0)}%`
                          : "0%"}
                      </p>
                      <p className="text-sm text-muted-foreground">Meeting Conversion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AnalyticsPage;
