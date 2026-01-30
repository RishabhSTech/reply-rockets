-- Create company_info table for storing company context for AI
CREATE TABLE public.company_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT,
  description TEXT,
  value_proposition TEXT,
  target_audience TEXT,
  key_benefits TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_info
CREATE POLICY "Users can view their own company info" 
ON public.company_info 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company info" 
ON public.company_info 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company info" 
ON public.company_info 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company info" 
ON public.company_info 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_company_info_updated_at
BEFORE UPDATE ON public.company_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create email_replies table for tracking incoming replies
CREATE TABLE public.email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  original_email_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT DEFAULT 'neutral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_replies
CREATE POLICY "Users can view their own email replies" 
ON public.email_replies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email replies" 
ON public.email_replies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email replies" 
ON public.email_replies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email replies" 
ON public.email_replies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public) VALUES ('company-docs', 'company-docs', false);

-- Storage policies for company documents
CREATE POLICY "Users can view their own company docs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own company docs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own company docs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own company docs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-docs' AND auth.uid()::text = (storage.foldername(name))[1]);