import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { EmailComposer } from "@/components/composer/EmailComposer";

const ComposePage = () => {
  const [currentPath, setCurrentPath] = useState("/compose");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="AI Composer" 
          onNewCampaign={() => navigate("/leads")} 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <EmailComposer />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComposePage;
