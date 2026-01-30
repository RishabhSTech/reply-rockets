import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SmtpSettings } from "@/components/settings/SmtpSettings";
import { WarmupSettings } from "@/components/settings/WarmupSettings";
import { CompanyInfoSettings } from "@/components/settings/CompanyInfoSettings";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const [currentPath] = useState("/settings");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={(path) => navigate(path)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Settings" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 max-w-3xl">
            <CompanyInfoSettings />
            <AIProviderSettings />
            <SmtpSettings />
            <WarmupSettings />

            <div className="pt-4">
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Log Out
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
