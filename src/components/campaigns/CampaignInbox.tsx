import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Mail, Reply, Archive, MoreVertical, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CampaignInboxProps {
    campaignId: string;
}

interface EmailThread {
    id: string;
    fromEmail: string;
    fromName: string;
    leadName: string;
    subject: string;
    preview: string;
    date: string;
    status: "unread" | "read";
    body: string;
    receivedAt: string;
    isSent?: boolean;
}

export function CampaignInbox({ campaignId }: CampaignInboxProps) {
    const [threads, setThreads] = useState<EmailThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReplies();
    }, [campaignId]);

    const loadReplies = async () => {
        try {
            // Fetch email replies for this campaign's leads
            const { data: replies, error: repliesError } = await supabase
                .from("email_replies")
                .select(`
                    *,
                    leads (name, position),
                    email_logs (campaign_id)
                `)
                .order("received_at", { ascending: false });

            if (repliesError) throw repliesError;

            // Filter replies for this campaign
            const campaignReplies = (replies || [])
                .filter(r => r.email_logs?.campaign_id === campaignId)
                .map(r => ({
                    id: r.id,
                    fromEmail: r.from_email,
                    fromName: r.from_name || r.from_email,
                    leadName: r.leads?.name || "Unknown",
                    subject: r.subject,
                    preview: r.body.substring(0, 50) + (r.body.length > 50 ? "..." : ""),
                    date: new Date(r.received_at).toLocaleDateString(),
                    status: (r.is_read ? "read" : "unread") as "read" | "unread",
                    body: r.body,
                    receivedAt: r.received_at,
                }));

            // Also fetch sent emails for this campaign
            const { data: sentEmails, error: emailsError } = await supabase
                .from("email_logs")
                .select(`
                    id,
                    subject,
                    body,
                    to_email,
                    sent_at,
                    leads (name)
                `)
                .eq("campaign_id", campaignId)
                .eq("status", "sent")
                .order("sent_at", { ascending: false });

            if (emailsError) throw emailsError;

            // Map sent emails to thread format
            const sentEmailThreads = (sentEmails || []).map(e => ({
                id: `sent_${e.id}`,
                fromEmail: e.to_email,
                fromName: e.leads?.name || "Unknown",
                leadName: e.leads?.name || "Unknown",
                subject: e.subject,
                preview: e.body.substring(0, 50) + (e.body.length > 50 ? "..." : ""),
                date: new Date(e.sent_at).toLocaleDateString(),
                status: "read" as const,
                body: e.body,
                receivedAt: e.sent_at,
                isSent: true,
            }));

            // Combine and sort by date
            const allThreads = [...campaignReplies, ...sentEmailThreads].sort(
                (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
            );

            setThreads(allThreads);
        } catch (error) {
            console.error("Error loading replies:", error);
            toast.error("Failed to load replies");
        } finally {
            setLoading(false);
        }
    };

    const selectedThread = threads.find(t => t.id === selectedThreadId);

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedThread) {
            toast.error("Please enter a reply");
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Here you would typically send the reply through your email service
            toast.success("Reply sent successfully");
            setReplyText("");
            loadReplies();
        } catch (error: any) {
            toast.error(error.message || "Failed to send reply");
        }
    };



    return (
        <div className="grid grid-cols-12 gap-0 h-[600px] border rounded-lg overflow-hidden bg-background">
            {/* Thread List */}
            <div className="col-span-4 border-r flex flex-col">
                <div className="p-4 border-b space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Inbox
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search replies..." className="pl-9" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                            Loading...
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            No email replies yet
                        </div>
                    ) : (
                        threads.map(thread => (
                            <div
                                key={thread.id}
                                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedThreadId === thread.id ? 'bg-muted/80' : ''} ${thread.status === 'unread' ? 'bg-blue-50/30' : ''}`}
                                onClick={() => setSelectedThreadId(thread.id)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm ${thread.status === 'unread' ? 'font-bold' : 'font-medium'}`}>
                                        {thread.leadName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{thread.date}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">{thread.fromEmail}</div>
                                <div className="text-xs font-medium truncate mb-1">{thread.subject}</div>
                                <div className="text-xs text-muted-foreground truncate opacity-80">{thread.preview}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message View */}
            <div className="col-span-8 flex flex-col bg-slate-50/50">
                {selectedThread ? (
                    <>
                        <div className="p-6 border-b bg-background flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>{selectedThread.leadName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="font-semibold">{selectedThread.subject}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedThread.leadName} <span className="text-xs px-1">&bull;</span> {selectedThread.fromEmail}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon"><Archive className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className={`flex justify-start`}>
                                <div className={`max-w-[80%] rounded-lg p-4 bg-white border`}>
                                    <p className="text-sm whitespace-pre-wrap">{selectedThread.body}</p>
                                    <div className={`text-[10px] mt-2 text-muted-foreground`}>
                                        {new Date(selectedThread.receivedAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-background">
                            <div className="space-y-4">
                                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Suggest: Schedule Call</Badge>
                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Suggest: Send Info</Badge>
                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Suggest: Not Interested</Badge>
                                </div>
                                <Textarea
                                    placeholder="Type your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="min-h-[100px]"
                                />
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2">
                                        {/* Formatting tools could go here */}
                                    </div>
                                    <Button onClick={handleSendReply}>
                                        <Reply className="w-4 h-4 mr-2" />
                                        Send Reply
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <Mail className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a conversation to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}
