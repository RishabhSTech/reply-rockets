-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  requirement TEXT NOT NULL,
  founder_linkedin TEXT,
  website_url TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SMTP settings table
CREATE TABLE public.smtp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warmup settings table
CREATE TABLE public.warmup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  current_daily_limit INTEGER NOT NULL DEFAULT 5,
  max_daily_limit INTEGER NOT NULL DEFAULT 50,
  ramp_up_rate INTEGER NOT NULL DEFAULT 2,
  send_window_start INTEGER NOT NULL DEFAULT 9,
  send_window_end INTEGER NOT NULL DEFAULT 17,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warmup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads
CREATE POLICY "Users can view their own leads" 
ON public.leads FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leads" 
ON public.leads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads" 
ON public.leads FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads" 
ON public.leads FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for smtp_settings
CREATE POLICY "Users can view their own smtp settings" 
ON public.smtp_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own smtp settings" 
ON public.smtp_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smtp settings" 
ON public.smtp_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smtp settings" 
ON public.smtp_settings FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for warmup_settings
CREATE POLICY "Users can view their own warmup settings" 
ON public.warmup_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own warmup settings" 
ON public.warmup_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warmup settings" 
ON public.warmup_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warmup settings" 
ON public.warmup_settings FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for email_logs
CREATE POLICY "Users can view their own email logs" 
ON public.email_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email logs" 
ON public.email_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smtp_settings_updated_at
BEFORE UPDATE ON public.smtp_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warmup_settings_updated_at
BEFORE UPDATE ON public.warmup_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();