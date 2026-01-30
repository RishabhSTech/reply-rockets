import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: "new" | "contacted" | "replied" | "meeting";
  lastActivity: string;
}

const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@techcorp.com",
    company: "TechCorp",
    role: "VP of Sales",
    status: "replied",
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    name: "Michael Ross",
    email: "michael@growthio.com",
    company: "GrowthIO",
    role: "Head of Growth",
    status: "meeting",
    lastActivity: "1 day ago",
  },
  {
    id: "3",
    name: "Emily Watson",
    email: "emily@scaleup.co",
    company: "ScaleUp",
    role: "CEO",
    status: "contacted",
    lastActivity: "3 hours ago",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david@innovate.io",
    company: "Innovate",
    role: "CTO",
    status: "new",
    lastActivity: "Just now",
  },
  {
    id: "5",
    name: "Lisa Park",
    email: "lisa@futuretech.com",
    company: "FutureTech",
    role: "Director of Ops",
    status: "contacted",
    lastActivity: "5 hours ago",
  },
];

const statusStyles = {
  new: "bg-primary/10 text-primary border-primary/20",
  contacted: "bg-warning/10 text-warning border-warning/20",
  replied: "bg-success/10 text-success border-success/20",
  meeting: "bg-accent/10 text-accent border-accent/20",
};

export function LeadsTable() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Recent Leads</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your latest prospects and their status
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Lead
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Activity
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-secondary/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {lead.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-foreground">{lead.company}</p>
                    <p className="text-sm text-muted-foreground">{lead.role}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", statusStyles[lead.status])}
                  >
                    {lead.status}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {lead.lastActivity}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                        <DropdownMenuItem>Add to Campaign</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
