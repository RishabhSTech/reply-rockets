import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Video, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Meeting {
  id: string;
  title: string;
  lead_id: string | null;
  lead_name: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type: "video" | "in-person" | "phone";
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  meeting_link?: string;
  notes?: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
}

const MeetingsPage = () => {
  const [currentPath, setCurrentPath] = useState("/meetings");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    lead_id: "",
    scheduled_at: "",
    duration_minutes: 30,
    meeting_type: "video" as "video" | "in-person" | "phone",
    meeting_link: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadData();
      }
    });
  }, [navigate]);

  const loadData = async () => {
    try {
      const [{ data: meetingsData }, { data: leadsData }] = await Promise.all([
        supabase
          .from("meetings")
          .select("*, leads(name)")
          .order("scheduled_at", { ascending: true }),
        supabase.from("leads").select("id, name, email"),
      ]);

      const formattedMeetings: Meeting[] = (meetingsData || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        lead_id: m.lead_id,
        lead_name: m.leads?.name || "Unknown",
        scheduled_at: m.scheduled_at,
        duration_minutes: m.duration_minutes,
        meeting_type: m.meeting_type,
        status: m.status,
        meeting_link: m.meeting_link,
        notes: m.notes,
      }));

      setMeetings(formattedMeetings);
      setLeads(leadsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    if (!newMeeting.title || !newMeeting.scheduled_at) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("meetings").insert({
        user_id: user.id,
        title: newMeeting.title,
        lead_id: newMeeting.lead_id || null,
        scheduled_at: new Date(newMeeting.scheduled_at).toISOString(),
        duration_minutes: newMeeting.duration_minutes,
        meeting_type: newMeeting.meeting_type,
        meeting_link: newMeeting.meeting_link || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });

      setNewMeeting({
        title: "",
        lead_id: "",
        scheduled_at: "",
        duration_minutes: 30,
        meeting_type: "video",
        meeting_link: "",
      });
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive",
      });
    }
  };

  const updateMeetingStatus = async (meetingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("meetings")
        .update({ status })
        .eq("id", meetingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Meeting marked as ${status}`,
      });

      loadData();
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to update meeting",
        variant: "destructive",
      });
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting deleted",
      });

      loadData();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    navigate(path);
  };

  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return format(date, "MMM d, yyyy");
  };

  const formatMeetingTime = (dateStr: string, duration: number) => {
    const start = new Date(dateStr);
    const end = new Date(start.getTime() + duration * 60000);
    return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "in-person":
        return <MapPin className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Meetings" onNewCampaign={() => setDialogOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Scheduled Meetings
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your upcoming meetings with leads
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="Meeting title"
                      value={newMeeting.title}
                      onChange={(e) =>
                        setNewMeeting({ ...newMeeting, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select
                      value={newMeeting.lead_id}
                      onValueChange={(value) =>
                        setNewMeeting({ ...newMeeting, lead_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={newMeeting.scheduled_at}
                      onChange={(e) =>
                        setNewMeeting({
                          ...newMeeting,
                          scheduled_at: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (min)</Label>
                      <Select
                        value={String(newMeeting.duration_minutes)}
                        onValueChange={(value) =>
                          setNewMeeting({
                            ...newMeeting,
                            duration_minutes: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="45">45 min</SelectItem>
                          <SelectItem value="60">60 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newMeeting.meeting_type}
                        onValueChange={(value: "video" | "in-person" | "phone") =>
                          setNewMeeting({ ...newMeeting, meeting_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="in-person">In-person</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Link</Label>
                    <Input
                      placeholder="https://zoom.us/..."
                      value={newMeeting.meeting_link}
                      onChange={(e) =>
                        setNewMeeting({
                          ...newMeeting,
                          meeting_link: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={createMeeting}>Schedule</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-muted rounded w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-64" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No meetings scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first meeting with a lead
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {meeting.lead_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {meeting.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {meeting.lead_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            meeting.status === "scheduled"
                              ? "default"
                              : meeting.status === "completed"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {meeting.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMeeting(meeting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatMeetingDate(meeting.scheduled_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatMeetingTime(
                            meeting.scheduled_at,
                            meeting.duration_minutes
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getTypeIcon(meeting.meeting_type)}
                        <span className="capitalize">{meeting.meeting_type}</span>
                      </div>
                    </div>
                    {meeting.status === "scheduled" && (
                      <div className="flex gap-2 mt-4">
                        {meeting.meeting_link && (
                          <Button
                            size="sm"
                            onClick={() =>
                              window.open(meeting.meeting_link, "_blank")
                            }
                          >
                            Join Meeting
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateMeetingStatus(meeting.id, "completed")
                          }
                        >
                          Mark Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateMeetingStatus(meeting.id, "cancelled")
                          }
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MeetingsPage;
