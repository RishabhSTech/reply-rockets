import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onLeadsAdded: () => void;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  position?: string;
  company?: string;
  status?: string;
  campaign_id?: string;
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

export function AddLeadsDialog({
  open,
  onOpenChange,
  campaignId,
  onLeadsAdded,
}: AddLeadsDialogProps) {
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableLeads();
    }
  }, [open]);

  const loadAvailableLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("name");

      if (error) throw error;
      setAvailableLeads(data || []);
      setSelectedLeads(new Set());
    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = availableLeads.filter((lead) =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleAddLeads = async () => {
    if (selectedLeads.size === 0) {
      toast.error("Please select at least one lead");
      return;
    }

    try {
      setIsAdding(true);
      const leadsToAdd = Array.from(selectedLeads);

      const { error } = await supabase
        .from("leads")
        .update({ campaign_id: campaignId })
        .in("id", leadsToAdd);

      if (error) throw error;

      toast.success(`Added ${selectedLeads.size} lead${selectedLeads.size !== 1 ? "s" : ""} to campaign`);
      onLeadsAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding leads:", error);
      toast.error("Failed to add leads to campaign");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-96 flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Leads to Campaign</DialogTitle>
          <DialogDescription>
            Search and select leads from your list to add to this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Leads List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                {searchQuery ? "No leads found matching your search" : "No leads available"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleLeadSelection(lead.id)}
                  >
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {lead.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{lead.name}</h4>
                        {lead.campaign_id && (
                          <Badge variant="secondary" className="text-xs">
                            In campaign
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.email} • {lead.company}
                      </p>
                    </div>
                    {lead.status && (
                      <Badge
                        variant="outline"
                        className={cn("capitalize font-normal text-xs", statusStyles[lead.status] || "")}
                      >
                        {lead.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLeads}
            disabled={selectedLeads.size === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                Add ({selectedLeads.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
