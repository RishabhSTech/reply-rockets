import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Send, Trash2, Plus, Edit2, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DraftEmail {
  id: string;
  subject: string;
  body: string;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
}

export function DraftEmails({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DraftEmail[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ subject: "", body: "" });
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadDrafts();
    loadLeads();
  }, [campaignId]);

  const loadDrafts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use raw fetch since draft_emails may not be in generated types yet
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/draft_emails?campaign_id=eq.${campaignId}&user_id=eq.${user.id}&order=updated_at.desc`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load drafts');
      const data = await response.json();
      setDrafts(data || []);
    } catch (error) {
      console.error("Error loading drafts:", error);
      toast({ title: "Error", description: "Failed to load drafts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, email")
        .eq("campaign_id", campaignId)
        .order("name");

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error loading leads:", error);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.subject.trim() || !formData.body.trim()) {
      toast({ title: "Error", description: "Please fill in subject and body", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (editingId) {
        // Update existing draft
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/draft_emails?id=eq.${editingId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              subject: formData.subject,
              body: formData.body,
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to update draft');
        toast({ title: "Success", description: "Draft updated" });
      } else {
        // Create new draft
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/draft_emails`,
          {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              campaign_id: campaignId,
              user_id: user.id,
              subject: formData.subject,
              body: formData.body,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to create draft');
        toast({ title: "Success", description: "Draft saved" });
      }

      setFormData({ subject: "", body: "" });
      setEditingId(null);
      setIsOpen(false);
      loadDrafts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save draft", variant: "destructive" });
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/draft_emails?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
            'Prefer': 'return=minimal',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete draft');
      toast({ title: "Success", description: "Draft deleted" });
      loadDrafts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete draft", variant: "destructive" });
    }
  };

  const handleEditDraft = (draft: DraftEmail) => {
    setFormData({ subject: draft.subject, body: draft.body });
    setEditingId(draft.id);
    setIsOpen(true);
  };

  const handleSendDraft = async (draft: DraftEmail) => {
    if (selectedLeadIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one lead", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Send to each selected lead
      for (const leadId of selectedLeadIds) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) continue;

        // Use the send-email function
        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            leadId: lead.id,
            toEmail: lead.email,
            subject: draft.subject,
            body: draft.body,
            campaignId: campaignId,
          },
        });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Email sent to ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? "s" : ""}`,
      });

      setSelectedLeadIds([]);
      setIsOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send draft", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading drafts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Draft Emails
        </h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setFormData({ subject: "", body: "" }); setEditingId(null); setSelectedLeadIds([]); }} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Draft
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Draft" : "Create Draft Email"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <RichTextEditor
                  value={formData.body}
                  onChange={(body) => setFormData({ ...formData, body })}
                  placeholder="Email body..."
                  className="min-h-[200px]"
                />
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <Label>Send to Leads</Label>
                  <Select
                    value={selectedLeadIds[0] || ""}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedLeadIds(leads.map(l => l.id));
                      } else if (!selectedLeadIds.includes(value)) {
                        setSelectedLeadIds([...selectedLeadIds, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leads to send to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leads ({leads.length})</SelectItem>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} ({lead.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLeadIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedLeadIds.map(id => {
                        const lead = leads.find(l => l.id === id);
                        return (
                          <Badge key={id} variant="secondary">
                            {lead?.name}
                            <button
                              onClick={() => setSelectedLeadIds(selectedLeadIds.filter(lid => lid !== id))}
                              className="ml-1 text-xs"
                            >
                              ✕
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {editingId ? (
                  <>
                    <Button onClick={handleSaveDraft} className="flex-1">Save Changes</Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleSaveDraft}
                      variant="outline"
                      className="flex-1"
                    >
                      Save as Draft
                    </Button>
                    <Button
                      onClick={() => handleSendDraft({ id: "", subject: formData.subject, body: formData.body, campaignId, createdAt: "", updatedAt: "" })}
                      disabled={selectedLeadIds.length === 0 || isSending}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send Now
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No draft emails yet. Create one to get started!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {drafts.map(draft => (
            <Card key={draft.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{draft.subject}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{draft.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(draft.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDraft(draft)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDraft(draft.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
