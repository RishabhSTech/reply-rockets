import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import LeadsPage from "./pages/LeadsPage";
import SettingsPage from "./pages/SettingsPage";
import CampaignsPage from "./pages/CampaignsPage";
import ComposePage from "./pages/ComposePage";
import InboxPage from "./pages/InboxPage";
import MeetingsPage from "./pages/MeetingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
