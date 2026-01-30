-- Add persona columns to leads table for storing AI-generated insights
ALTER TABLE public.leads ADD COLUMN persona_insights JSONB;
ALTER TABLE public.leads ADD COLUMN persona_generated_at TIMESTAMP WITH TIME ZONE;

-- Create sequences table for email sequences
CREATE TABLE public.sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt_config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies for sequences
CREATE POLICY "Users can view their own sequences" 
  ON public.sequences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sequences" 
  ON public.sequences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequences" 
  ON public.sequences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sequences" 
  ON public.sequences FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON public.sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to campaigns for tracking send status
ALTER TABLE public.campaigns ADD COLUMN emails_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN last_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.campaigns ADD COLUMN prompt_json JSONB;

-- Add sequence_id to email_logs to track which sequence generated an email
ALTER TABLE public.email_logs ADD COLUMN sequence_id UUID REFERENCES public.sequences(id) ON DELETE SET NULL;
