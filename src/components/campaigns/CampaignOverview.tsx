import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, MousePointerClick, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignOverviewProps {
    campaign: any;
}

export function CampaignOverview({ campaign }: CampaignOverviewProps) {
    const [stats, setStats] = useState({
        totalLeads: 0,
        emailsSent: 0,
        openRate: 0,
        replyRate: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
        
        // Set up real-time subscription for email logs
        console.log("📡 Setting up real-time subscription for campaign:", campaign.id);
        const emailLogsSubscription = supabase
            .channel(`campaign_stats_${campaign.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "email_logs",
                    filter: `campaign_id=eq.${campaign.id}`,
                },
                (payload) => {
                    console.log("🔔 Real-time update received for campaign stats:", payload);
                    loadStats();
                }
            )
            .subscribe((status) => {
                console.log("📡 Subscription status:", status);
            });

        return () => {
            emailLogsSubscription.unsubscribe();
        };
    }, [campaign.id]);

    const loadStats = async () => {
        try {
            // Get total leads in this campaign
            const { data: leadsData, error: leadsError } = await supabase
                .from("leads")
                .select("id", { count: "exact" })
                .eq("campaign_id", campaign.id);

            // Get email stats
            const { data: emailsData, error: emailsError } = await supabase
                .from("email_logs")
                .select("*")
                .eq("campaign_id", campaign.id);

            if (leadsError || emailsError) throw new Error("Failed to load stats");

            const totalLeads = leadsData?.length || 0;
            const emailsSent = emailsData?.filter(e => e.status === "sent").length || 0;
            const emailsOpened = emailsData?.filter(e => e.opened_at).length || 0;

            console.log("📊 Campaign stats loaded for", campaign.id);
            console.log("   - Total emails in logs:", emailsData?.length || 0);
            console.log("   - Emails with status 'sent':", emailsSent);
            console.log("   - Emails with campaign_id set:", emailsData?.filter(e => e.campaign_id).length || 0);

            // Get replies for this campaign's leads via email_logs
            const campaignEmailIds = emailsData?.map(e => e.id) || [];
            let replyCount = 0;

            if (campaignEmailIds.length > 0) {
                const { data: repliesData } = await supabase
                    .from("email_replies")
                    .select("id")
                    .in("original_email_id", campaignEmailIds);
                replyCount = repliesData?.length || 0;
            }

            const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;
            const replyRate = emailsSent > 0 ? Math.round((replyCount / emailsSent) * 100) : 0;

            setStats({
                totalLeads,
                emailsSent,
                openRate,
                replyRate,
            });
        } catch (error) {
            console.error("Error loading stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: "Total Leads",
            value: stats.totalLeads.toString(),
            icon: Users,
            change: "+0%",
            desc: "in this campaign",
        },
        {
            title: "Emails Sent",
            value: stats.emailsSent.toString(),
            icon: Mail,
            change: "+0%",
            desc: "from this campaign",
        },
        {
            title: "Open Rate",
            value: `${stats.openRate}%`,
            icon: MousePointerClick,
            change: "+0%",
            desc: "of sent emails",
        },
        {
            title: "Reply Rate",
            value: `${stats.replyRate}%`,
            icon: MessageSquare,
            change: "+0%",
            desc: "of sent emails",
        },
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 bg-muted rounded w-24" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {stat.desc}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Campaign Status</CardTitle>
                    <Button variant="ghost" size="icon" onClick={loadStats} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium capitalize">{campaign.status}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Created</span>
                            <span className="font-medium">{new Date(campaign.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Leads</span>
                            <span className="font-medium">{stats.totalLeads}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
