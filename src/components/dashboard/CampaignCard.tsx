import { cn } from "@/lib/utils";
import { Mail, Users, MousePointer, Reply } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CampaignCardProps {
  name: string;
  status: "active" | "paused" | "completed";
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  delay?: number;
}

export function CampaignCard({
  name,
  status,
  sent,
  opened,
  clicked,
  replied,
  delay = 0,
}: CampaignCardProps) {
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

  const statusStyles = {
    active: "bg-success/10 text-success border-success/20",
    paused: "bg-warning/10 text-warning border-warning/20",
    completed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div
      className="p-5 bg-card rounded-xl border border-border hover:shadow-card-hover transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sent.toLocaleString()} emails sent
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("capitalize", statusStyles[status])}
        >
          {status}
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Open Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>Open Rate</span>
            </div>
            <span className="font-medium text-foreground">{openRate}%</span>
          </div>
          <Progress value={openRate} className="h-1.5" />
        </div>

        {/* Click Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MousePointer className="w-4 h-4" />
              <span>Click Rate</span>
            </div>
            <span className="font-medium text-foreground">{clickRate}%</span>
          </div>
          <Progress value={clickRate} className="h-1.5" />
        </div>

        {/* Reply Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Reply className="w-4 h-4" />
              <span>Reply Rate</span>
            </div>
            <span className="font-medium text-foreground">{replyRate}%</span>
          </div>
          <Progress value={replyRate} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}
