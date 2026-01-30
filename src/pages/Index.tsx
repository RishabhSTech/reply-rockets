import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmailComposer } from "@/components/composer/EmailComposer";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { Mail, Users, Reply, Calendar } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

interface Stats {
  emailsSent: number;
  activeLeads: number;
  replyRate: string;
  meetingsBooked: number;
  emailsChange: { value: string; trend: "up" | "down" };
  leadsChange: { value: string; trend: "up" | "down" };
  replyChange: { value: string; trend: "up" | "down" };
  meetingsChange: { value: string; trend: "up" | "down" };
}

const Index = () => {
  const [currentPath, setCurrentPath] = useState("/");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({
    emailsSent: 0,
    activeLeads: 0,
    replyRate: "0%",
    meetingsBooked: 0,
    emailsChange: { value: "0%", trend: "up" },
    leadsChange: { value: "0%", trend: "up" },
    replyChange: { value: "0%", trend: "up" },
    meetingsChange: { value: "0%", trend: "up" },
  });
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async () => {
    await Promise.all([loadStats(), loadCampaigns()]);
  };

  const loadStats = async () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all data
    const [
      { data: allEmails },
      { data: allLeads },
      { data: allReplies },
      { data: allMeetings },
    ] = await Promise.all([
      supabase.from("email_logs").select("*"),
      supabase.from("leads").select("*"),
      supabase.from("email_replies").select("*"),
      supabase.from("meetings").select("*"),
    ]);

    // Current week stats
    const currentWeekEmails = allEmails?.filter(e => 
      e.status === "sent" && new Date(e.sent_at || e.created_at) >= oneWeekAgo
    ).length || 0;
    const previousWeekEmails = allEmails?.filter(e => 
      e.status === "sent" && 
      new Date(e.sent_at || e.created_at) >= twoWeeksAgo && 
      new Date(e.sent_at || e.created_at) < oneWeekAgo
    ).length || 0;

    const currentWeekLeads = allLeads?.filter(l => 
      new Date(l.created_at) >= oneWeekAgo
    ).length || 0;
    const previousWeekLeads = allLeads?.filter(l => 
      new Date(l.created_at) >= twoWeeksAgo && 
      new Date(l.created_at) < oneWeekAgo
    ).length || 0;

    const currentWeekReplies = allReplies?.filter(r => 
      new Date(r.received_at) >= oneWeekAgo
    ).length || 0;
    const previousWeekReplies = allReplies?.filter(r => 
      new Date(r.received_at) >= twoWeeksAgo && 
      new Date(r.received_at) < oneWeekAgo
    ).length || 0;

    const currentWeekMeetings = allMeetings?.filter(m => 
      new Date(m.created_at) >= oneWeekAgo
    ).length || 0;
    const previousWeekMeetings = allMeetings?.filter(m => 
      new Date(m.created_at) >= twoWeeksAgo && 
      new Date(m.created_at) < oneWeekAgo
    ).length || 0;

    // Calculate changes
    const calcChange = (current: number, previous: number): { value: string; trend: "up" | "down" } => {
      if (previous === 0) return { value: current > 0 ? "+100%" : "0%", trend: "up" };
      const change = ((current - previous) / previous) * 100;
      return {
        value: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
        trend: change >= 0 ? "up" : "down",
      };
    };

    // Total stats
    const totalEmails = allEmails?.filter(e => e.status === "sent").length || 0;
    const totalLeads = allLeads?.length || 0;
    const totalReplies = allReplies?.length || 0;
    const replyRate = totalEmails > 0 ? ((totalReplies / totalEmails) * 100).toFixed(1) : "0";
    const totalMeetings = allMeetings?.length || 0;

    setStats({
      emailsSent: totalEmails,
      activeLeads: totalLeads,
      replyRate: `${replyRate}%`,
      meetingsBooked: totalMeetings,
      emailsChange: calcChange(currentWeekEmails, previousWeekEmails),
      leadsChange: calcChange(currentWeekLeads, previousWeekLeads),
      replyChange: calcChange(currentWeekReplies, previousWeekReplies),
      meetingsChange: calcChange(currentWeekMeetings, previousWeekMeetings),
    });
  };

  const loadCampaigns = async () => {
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!campaignsData || campaignsData.length === 0) {
      setCampaigns([]);
      return;
    }

    // Get stats for each campaign
    const campaignStats = await Promise.all(
      campaignsData.map(async (campaign) => {
        const { data: emails } = await supabase
          .from("email_logs")
          .select("*")
          .eq("campaign_id", campaign.id);

        const { data: replies } = await supabase
          .from("email_replies")
          .select("*, email_logs!email_replies_original_email_id_fkey(campaign_id)")
          .not("original_email_id", "is", null);

        const campaignReplies = replies?.filter(
          (r: any) => r.email_logs?.campaign_id === campaign.id
        ).length || 0;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status as "active" | "paused" | "completed",
          sent: emails?.filter(e => e.status === "sent").length || 0,
          opened: emails?.filter(e => e.opened_at).length || 0,
          clicked: emails?.filter(e => e.clicked_at).length || 0,
          replied: campaignReplies,
        };
      })
    );

    setCampaigns(campaignStats);
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          onNewCampaign={() => navigate("/campaigns")} 
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Emails Sent"
                value={stats.emailsSent.toLocaleString()}
                change={stats.emailsChange}
                icon={Mail}
                iconColor="text-primary"
                delay={0}
              />
              <StatCard
                title="Active Leads"
                value={stats.activeLeads.toLocaleString()}
                change={stats.leadsChange}
                icon={Users}
                iconColor="text-accent"
                delay={50}
              />
              <StatCard
                title="Reply Rate"
                value={stats.replyRate}
                change={stats.replyChange}
                icon={Reply}
                iconColor="text-success"
                delay={100}
              />
              <StatCard
                title="Meetings Booked"
                value={stats.meetingsBooked.toString()}
                change={stats.meetingsChange}
                icon={Calendar}
                iconColor="text-warning"
                delay={150}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - Chart & Campaigns */}
              <div className="xl:col-span-2 space-y-6">
                <PerformanceChart />
                
                {/* Campaigns */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Active Campaigns
                    </h2>
                    <button 
                      onClick={() => navigate("/campaigns")}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      View all →
                    </button>
                  </div>
                  {campaigns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {campaigns.map((campaign, index) => (
                        <CampaignCard
                          key={campaign.id}
                          {...campaign}
                          delay={index * 50}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-card rounded-xl border border-border">
                      <p className="text-muted-foreground">No campaigns yet. Create your first campaign!</p>
                      <button
                        onClick={() => navigate("/campaigns")}
                        className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Create Campaign →
                      </button>
                    </div>
                  )}
                </div>

                {/* Leads Table */}
                <LeadsTable />
              </div>

              {/* Right Column - Composer & Activity */}
              <div className="space-y-6">
                <EmailComposer />
                <ActivityFeed />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
