import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ExternalLink, Linkedin, Mail, Trash2, MoreHorizontal, Send, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  position: string;
  requirement: string;
  founder_linkedin: string | null;
  website_url: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  "Pending": "bg-muted text-muted-foreground border-border",
  "Intro Sent": "bg-primary/10 text-primary border-primary/20",
  "Replied": "bg-success/10 text-success border-success/20",
  "1st Follow Up": "bg-warning/10 text-warning border-warning/20",
  "2nd Follow Up": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Not Interested": "bg-destructive/10 text-destructive border-destructive/20",
  "Meeting Booked": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load leads");
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete lead");
    } else {
      toast.success("Lead deleted");
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleCopyLeadData = (lead: Lead) => {
    const leadData = `Name: ${lead.name}
Position: ${lead.position}
Linkedin: ${lead.founder_linkedin || "N/A"}
Website: ${lead.website_url || "N/A"}
Requirement: ${lead.requirement}}`;

    navigator.clipboard.writeText(leadData).then(() => {
      toast.success("Lead data copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const handleSendEmail = async (lead: Lead) => {
    if (!lead.email) {
      toast.error("No email address for this lead");
      return;
    }

    try {
      const response = await supabase.functions.invoke("send-email", {
        body: {
          leadId: lead.id,
          toEmail: lead.email,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast.success("Email sent!");
      loadLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading leads...
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No leads yet. Add your first lead above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div>
            <CardTitle>Your Leads</CardTitle>
            <CardDescription>{leads.length} leads in your database</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {lead.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground truncate">{lead.name}</h4>
                  <Badge
                    variant="outline"
                    className={cn("capitalize text-xs", statusStyles[lead.status])}
                  >
                    {lead.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{lead.position}</p>
                <p className="text-sm text-foreground/80 mt-1 line-clamp-1">
                  {lead.requirement}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  {lead.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                  )}
                  {lead.founder_linkedin && (
                    <a
                      href={lead.founder_linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      <Linkedin className="w-3 h-3" />
                      LinkedIn
                    </a>
                  )}
                  {lead.website_url && (
                    <a
                      href={lead.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.keys(statusStyles).map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={async () => {
                          const { error } = await supabase
                            .from("leads")
                            .update({ status })
                            .eq("id", lead.id);

                          if (error) {
                            toast.error("Failed to update status");
                          } else {
                            toast.success(`Status updated to ${status}`);
                            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l));
                          }
                        }}
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopyLeadData(lead)}
                  title="Copy lead data"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </Button>

                {lead.email && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSendEmail(lead)}
                  >
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(lead.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
