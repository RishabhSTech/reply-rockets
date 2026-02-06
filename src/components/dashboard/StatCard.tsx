import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down";
  };
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className="group relative bg-card border border-border/50 rounded-lg p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-slide-up overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background Glow Effect */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500 opacity-0 group-hover:opacity-100" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-4xl font-bold text-foreground tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-2 pt-1">
              <div className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold",
                change.trend === "up"
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}>
                {change.trend === "up" ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{change.value}</span>
              </div>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "flex items-center justify-center w-14 h-14 rounded-lg flex-shrink-0",
          iconBg
        )}>
          <Icon className={cn("w-7 h-7", iconColor)} />
        </div>
      </div>
    </div>
  );
}
