import { cn } from "@/lib/utils";
import { Mail, Users, MousePointer, Reply, ArrowRight } from "lucide-react";
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
  onClick?: () => void;
}

export function CampaignCard({
  name,
  status,
  sent,
  opened,
  clicked,
  replied,
  delay = 0,
  onClick,
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
      className="group relative p-6 bg-card border border-border/50 rounded-lg hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-slide-up cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      {/* Hover Glow */}
      <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500 opacity-0 group-hover:opacity-100" />
      
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {sent.toLocaleString()} emails · {replied} replies
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("capitalize", statusStyles[status])}
          >
            {status}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 pt-2">
          {[
            { icon: Mail, label: "Open", value: openRate, unit: "%" },
            { icon: MousePointer, label: "Click", value: clickRate, unit: "%" },
            { icon: Reply, label: "Reply", value: replyRate, unit: "%" },
            { icon: Users, label: "Sent", value: sent, unit: "" }
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{metric.value}{metric.unit}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bars */}
        <div className="space-y-2 pt-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Open Rate</span>
              <span className="font-semibold text-foreground">{openRate}%</span>
            </div>
            <Progress value={openRate} className="h-1.5 bg-muted/50" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Click Rate</span>
              <span className="font-semibold text-foreground">{clickRate}%</span>
            </div>
            <Progress value={clickRate} className="h-1.5 bg-muted/50" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="text-xs text-muted-foreground">Active campaign</div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}
