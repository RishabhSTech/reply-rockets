import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { SequenceBuilder } from "@/components/campaigns/SequenceBuilder";
import { CampaignOverview } from "@/components/campaigns/CampaignOverview";
import { CampaignLeads } from "@/components/campaigns/CampaignLeads";
import { CampaignSettings } from "@/components/campaigns/CampaignSettings";
import { CampaignInbox } from "@/components/campaigns/CampaignInbox";
import { ManualSequenceSender } from "@/components/campaigns/ManualSequenceSender";

const CampaignDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentPath] = useState("/campaigns");

    useEffect(() => {
        if (!id) return;
        loadCampaign();
    }, [id]);

    const loadCampaign = async () => {
        try {
            const { data, error } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setCampaign(data);
        } catch (error) {
            console.error("Error loading campaign:", error);
            toast.error("Failed to load campaign");
            navigate("/campaigns");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!campaign) return null;

    return (
        <div className="flex h-screen bg-background">
            <Sidebar currentPath={currentPath} onNavigate={(path) => navigate(path)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header title={campaign.name} />

                <main className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="p-6 max-w-7xl mx-auto space-y-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">{campaign.name}</h2>
                                <p className="text-muted-foreground capitalize">Status: {campaign.status}</p>
                            </div>
                        </div>

                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                                <TabsTrigger
                                    value="overview"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                                >
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger
                                    value="leads"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                                >
                                    Leads
                                </TabsTrigger>
                                <TabsTrigger
                                    value="sequence"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                                >
                                    Sequence
                                </TabsTrigger>
                                <TabsTrigger
                                    value="manual-send"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                                >
                                    Manual Send
                                </TabsTrigger>
                                <TabsTrigger
                                    value="settings"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                                >
                                    Settings
                                </TabsTrigger>
                                <TabsTrigger
                                    value="inbox"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                                >
                                    Inbox
                                </TabsTrigger>
                            </TabsList>

                            <div className="mt-6">
                                <TabsContent value="overview">
                                    <CampaignOverview campaign={campaign} />
                                </TabsContent>
                                <TabsContent value="leads">
                                    <CampaignLeads campaignId={campaign.id} />
                                </TabsContent>
                                <TabsContent value="sequence">
                                    <SequenceBuilder
                                        campaignId={campaign.id}
                                        initialSequence={campaign.sequence || []}
                                    />
                                </TabsContent>
                                <TabsContent value="manual-send">
                                    <ManualSequenceSender />
                                </TabsContent>
                                <TabsContent value="inbox">
                                    <CampaignInbox campaignId={campaign.id} />
                                </TabsContent>
                                <TabsContent value="settings">
                                    <CampaignSettings campaignId={campaign.id} />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CampaignDetailsPage;
