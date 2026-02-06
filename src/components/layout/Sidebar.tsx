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
  AlertCircle,
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
  { icon: Mail, label: "Campaigns", href: "/campaigns" },
  { icon: Users, label: "Leads", href: "/leads" },
  { icon: Sparkles, label: "AI Composer", href: "/compose" },
  { icon: MessageSquare, label: "Inbox", href: "/inbox" },
  { icon: Calendar, label: "Meetings", href: "/meetings" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: AlertCircle, label: "Error Logs", href: "/error-logs" },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border/50 transition-all duration-300",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-20 px-5 border-b border-sidebar-border/30">
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex-shrink-0 shadow-lg">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                Reply
              </span>
              <span className="text-xs font-semibold text-sidebar-primary opacity-90">
                Rockets
              </span>
            </div>
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
                "flex items-center w-full gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sidebar-primary to-sidebar-primary/50 rounded-r-full" />
              )}
              
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border/30">
        <button
          onClick={() => onNavigate("/settings")}
          className={cn(
            "flex items-center w-full gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 group",
            currentPath === "/settings"
              ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Settings className={cn(
            "w-5 h-5 flex-shrink-0 transition-colors",
            currentPath === "/settings" ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
          )} />
          {!collapsed && (
            <span className="text-sm font-medium">Settings</span>
          )}
        </button>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full mt-3 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50 text-xs h-9"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Collapse
          </Button>
        )}

        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full mt-3 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50 h-9 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}

export function MobileSidebar({ currentPath, onNavigate }: SidebarProps) {
  const [open, setOpen] = useState(false);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden hover:bg-muted/50">
          <Menu className="w-5 h-5 text-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-sidebar w-72 border-r border-sidebar-border/50">
        {/* Logo */}
        <div className="flex items-center h-20 px-5 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex-shrink-0 shadow-lg">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                Reply
              </span>
              <span className="text-xs font-semibold text-sidebar-primary opacity-90">
                Rockets
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3 overflow-y-auto pb-20">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  "flex items-center w-full gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sidebar-primary to-sidebar-primary/50 rounded-r-full" />
                )}
                
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                  )}
                />
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="fixed bottom-0 left-0 right-0 p-3 border-t border-sidebar-border/30 bg-sidebar w-72">
          <button
            onClick={() => handleNavigate("/settings")}
            className={cn(
              "flex items-center w-full gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 group",
              currentPath === "/settings"
                ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Settings className={cn(
              "w-5 h-5 flex-shrink-0 transition-colors",
              currentPath === "/settings" ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
            )} />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
