import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    trend: "up" | "down";
  };
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className="stat-card-glow p-6 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <div className="flex items-center gap-1">
              {change.trend === "up" ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  change.trend === "up" ? "text-success" : "text-destructive"
                )}
              >
                {change.value}
              </span>
              <span className="text-sm text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl bg-secondary",
            iconColor
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
