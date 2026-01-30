import { useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DayData {
  name: string;
  opens: number;
  clicks: number;
  replies: number;
}

export function PerformanceChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [{ data: emails }, { data: replies }] = await Promise.all([
        supabase
          .from("email_logs")
          .select("*")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("email_replies")
          .select("*")
          .gte("received_at", sevenDaysAgo.toISOString()),
      ]);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const chartData: DayData[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        const dayName = dayNames[date.getDay()];

        const dayEmails = emails?.filter((e) => {
          const emailDate = new Date(e.created_at).toISOString().split("T")[0];
          return emailDate === dateStr;
        }) || [];

        const dayReplies = replies?.filter((r) => {
          const replyDate = new Date(r.received_at).toISOString().split("T")[0];
          return replyDate === dateStr;
        }) || [];

        chartData.push({
          name: dayName,
          opens: dayEmails.filter((e) => e.opened_at).length,
          clicks: dayEmails.filter((e) => e.clicked_at).length,
          replies: dayReplies.length,
        });
      }

      setData(chartData);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
        <div className="mb-5">
          <div className="h-5 bg-muted rounded w-40 mb-2" />
          <div className="h-4 bg-muted rounded w-56" />
        </div>
        <div className="h-[280px] bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
      <div className="mb-5">
        <h3 className="font-semibold text-foreground">Weekly Performance</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Opens, clicks, and replies over time
        </p>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Opens</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-sm text-muted-foreground">Clicks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">Replies</span>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(221, 83%, 53%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(221, 83%, 53%)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(168, 76%, 42%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(168, 76%, 42%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="opens"
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOpens)"
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="hsl(168, 76%, 42%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorClicks)"
            />
            <Line
              type="monotone"
              dataKey="replies"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={{ fill: "hsl(38, 92%, 50%)", strokeWidth: 0, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
