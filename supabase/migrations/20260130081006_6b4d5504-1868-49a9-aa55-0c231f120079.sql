-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" 
  ON public.campaigns FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" 
  ON public.campaigns FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
  ON public.campaigns FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
  ON public.campaigns FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add campaign_id to leads table to track which campaign a lead belongs to
ALTER TABLE public.leads ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add campaign_id to email_logs to track emails per campaign
ALTER TABLE public.email_logs ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add tracking columns to email_logs for opens and clicks
ALTER TABLE public.email_logs ADD COLUMN opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.email_logs ADD COLUMN clicked_at TIMESTAMP WITH TIME ZONE;

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_type TEXT NOT NULL DEFAULT 'video' CHECK (meeting_type IN ('video', 'in-person', 'phone')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetings
CREATE POLICY "Users can view their own meetings" 
  ON public.meetings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meetings" 
  ON public.meetings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings" 
  ON public.meetings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings" 
  ON public.meetings FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();