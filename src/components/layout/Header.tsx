import { Bell, Search, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./Sidebar";
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  onNewCampaign?: () => void;
}

export function Header({ title, onNewCampaign }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between h-20 px-6 md:px-8 bg-card border-b border-border/50 backdrop-blur-sm">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <MobileSidebar currentPath={location.pathname} onNavigate={(path) => navigate(path)} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {/* Optional subtitle can go here */}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Search - Hidden on Mobile */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns, leads..."
            className="w-72 pl-9 h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary transition-all"
          />
        </div>

        {/* New Campaign Button */}
        {onNewCampaign && (
          <Button 
            onClick={onNewCampaign} 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-4 hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        )}

        {/* New Campaign - Mobile */}
        {onNewCampaign && (
          <Button 
            onClick={onNewCampaign} 
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground sm:hidden"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-muted/50 rounded-lg"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse" />
        </Button>

        {/* Settings */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/settings')}
          className="hover:bg-muted/50 rounded-lg hidden md:flex"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-10 w-10 rounded-lg hover:bg-muted/50 pl-1 pr-1"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  RR
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">Reply Rockets</p>
                <p className="text-xs leading-none text-muted-foreground">
                  your@email.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Profile Settings</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Team & Workspace</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Billing & Plans</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
