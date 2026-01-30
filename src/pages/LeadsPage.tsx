import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadsList } from "@/components/leads/LeadsList";

const LeadsPage = () => {
  const [currentPath] = useState("/leads");
  const [refreshKey, setRefreshKey] = useState(0);
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

  const handleLeadAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={(path) => navigate(path)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Leads" />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <LeadForm onLeadAdded={handleLeadAdded} />
            <LeadsList key={refreshKey} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeadsPage;
