import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Mail,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  Calendar,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Mail, label: "Campaigns", href: "/campaigns", badge: "3" },
  { icon: Users, label: "Leads", href: "/leads" },
  { icon: Sparkles, label: "AI Composer", href: "/compose" },
  { icon: MessageSquare, label: "Inbox", href: "/inbox", badge: "12" },
  { icon: Calendar, label: "Meetings", href: "/meetings" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
            <Zap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">
              OutboundAI
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={cn(
                "flex items-center w-full gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive && "text-sidebar-primary"
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings & Collapse */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => onNavigate("/settings")}
          className={cn(
            "flex items-center w-full gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">Settings</span>
          )}
        </button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full mt-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
