import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Star, 
  Loader2, 
  ArrowLeft, 
  Reply as ReplyIcon, 
  Trash2,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EmailReply {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  body: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  sentiment: string | null;
  lead_id: string | null;
  leads?: {
    name: string;
    position: string;
  } | null;
}

const InboxPage = () => {
  const [currentPath, setCurrentPath] = useState("/inbox");
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [selectedReply, setSelectedReply] = useState<EmailReply | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadReplies();
      }
    });
  }, [navigate]);

  const loadReplies = async () => {
    try {
      const { data, error } = await supabase
        .from("email_replies")
        .select(`
          *,
          leads (name, position)
        `)
        .order("received_at", { ascending: false });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error("Error loading replies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    navigate(path);
  };

  const handleSelectReply = async (reply: EmailReply) => {
    setSelectedReply(reply);
    
    // Mark as read
    if (!reply.is_read) {
      const { error } = await supabase
        .from("email_replies")
        .update({ is_read: true })
        .eq("id", reply.id);
      
      if (!error) {
        setReplies(prev => prev.map(r => 
          r.id === reply.id ? { ...r, is_read: true } : r
        ));
      }
    }
  };

  const handleToggleStar = async (reply: EmailReply, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("email_replies")
      .update({ is_starred: !reply.is_starred })
      .eq("id", reply.id);
    
    if (!error) {
      setReplies(prev => prev.map(r => 
        r.id === reply.id ? { ...r, is_starred: !r.is_starred } : r
      ));
      if (selectedReply?.id === reply.id) {
        setSelectedReply({ ...reply, is_starred: !reply.is_starred });
      }
    }
  };

  const handleDeleteReply = async (reply: EmailReply) => {
    const { error } = await supabase
      .from("email_replies")
      .delete()
      .eq("id", reply.id);
    
    if (!error) {
      setReplies(prev => prev.filter(r => r.id !== reply.id));
      setSelectedReply(null);
      toast({
        title: "Deleted",
        description: "Reply removed from inbox",
      });
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getSentimentBadge = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return <Badge variant="default" className="bg-green-500/10 text-green-600">Positive</Badge>;
      case "negative":
        return <Badge variant="destructive">Negative</Badge>;
      case "neutral":
        return <Badge variant="secondary">Neutral</Badge>;
      default:
        return null;
    }
  };

  const unreadCount = replies.filter(r => !r.is_read).length;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={`Inbox ${unreadCount > 0 ? `(${unreadCount})` : ""}`} 
          onNewCampaign={() => navigate("/leads")} 
        />
        
        <main className="flex-1 overflow-hidden flex">
          {/* Email List */}
          <div className={`${selectedReply ? "w-1/3 border-r" : "w-full"} overflow-y-auto p-4`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No replies yet</h3>
                <p className="text-muted-foreground mt-1">
                  Replies to your outreach will appear here
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  You can also manually add replies for tracking
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {replies.map((reply) => (
                  <Card 
                    key={reply.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !reply.is_read ? "bg-primary/5 border-primary/20" : ""
                    } ${selectedReply?.id === reply.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => handleSelectReply(reply)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {(reply.from_name || reply.from_email)
                              .split(/[\s@]/)
                              .slice(0, 2)
                              .map(n => n[0]?.toUpperCase())
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`truncate ${!reply.is_read ? "font-semibold" : ""}`}>
                                {reply.from_name || reply.from_email}
                              </span>
                              {!reply.is_read && (
                                <Badge variant="default" className="text-xs shrink-0">New</Badge>
                              )}
                              {getSentimentIcon(reply.sentiment)}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={(e) => handleToggleStar(reply, e)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                <Star 
                                  className={`h-4 w-4 ${
                                    reply.is_starred 
                                      ? "text-yellow-500 fill-yellow-500" 
                                      : "text-muted-foreground"
                                  }`} 
                                />
                              </button>
                            </div>
                          </div>
                          <p className={`text-sm mt-0.5 truncate ${!reply.is_read ? "font-medium" : ""}`}>
                            {reply.subject}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {reply.body.slice(0, 80)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(reply.received_at), { addSuffix: true })}
                            </span>
                            {reply.leads && (
                              <>
                                <span>•</span>
                                <span>{reply.leads.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Email Detail */}
          {selectedReply && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mb-4"
                  onClick={() => setSelectedReply(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to inbox
                </Button>

                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(selectedReply.from_name || selectedReply.from_email)
                            .split(/[\s@]/)
                            .slice(0, 2)
                            .map(n => n[0]?.toUpperCase())
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-lg font-semibold">
                          {selectedReply.from_name || selectedReply.from_email}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedReply.from_email}
                        </p>
                        {selectedReply.leads && (
                          <p className="text-sm text-muted-foreground">
                            Lead: {selectedReply.leads.name} - {selectedReply.leads.position}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSentimentBadge(selectedReply.sentiment)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleToggleStar(selectedReply, e)}
                      >
                        <Star 
                          className={`h-5 w-5 ${
                            selectedReply.is_starred 
                              ? "text-yellow-500 fill-yellow-500" 
                              : "text-muted-foreground"
                          }`} 
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReply(selectedReply)}
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Subject & Date */}
                  <div className="border-b pb-4">
                    <h3 className="text-xl font-medium">{selectedReply.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Received {formatDistanceToNow(new Date(selectedReply.received_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {selectedReply.body}
                  </div>

                  {/* Actions */}
                  <div className="pt-6 border-t">
                    <div className="flex gap-3">
                      <Button className="gap-2">
                        <ReplyIcon className="h-4 w-4" />
                        Reply
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Mark as Meeting Booked
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default InboxPage;
