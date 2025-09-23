-- Create admins table for authentication
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  school_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create parents table
CREATE TABLE public.parents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT,
  student_name TEXT,
  class_year TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'scheduled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create logs table for SMS delivery tracking
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
  gateway_response JSONB,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admins (only authenticated admins can access their own data)
CREATE POLICY "Admins can view their own profile" 
ON public.admins 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can update their own profile" 
ON public.admins 
FOR UPDATE 
USING (auth.uid() = id);

-- Create policies for parents (admins can manage all parents)
CREATE POLICY "Authenticated admins can view all parents" 
ON public.parents 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated admins can insert parents" 
ON public.parents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated admins can update parents" 
ON public.parents 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated admins can delete parents" 
ON public.parents 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create policies for messages (admins can manage their own messages)
CREATE POLICY "Admins can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = admin_id);

CREATE POLICY "Admins can create their own messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = admin_id);

-- Create policies for SMS logs (admins can view logs for their messages)
CREATE POLICY "Admins can view logs for their messages" 
ON public.sms_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages 
    WHERE messages.id = sms_logs.message_id 
    AND messages.admin_id = auth.uid()
  )
);

CREATE POLICY "Authenticated admins can insert SMS logs" 
ON public.sms_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated admins can update SMS logs" 
ON public.sms_logs 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_parents_phone_number ON public.parents(phone_number);
CREATE INDEX idx_parents_class_year ON public.parents(class_year);
CREATE INDEX idx_parents_region ON public.parents(region);
CREATE INDEX idx_messages_admin_id ON public.messages(admin_id);
CREATE INDEX idx_messages_status ON public.messages(status);
CREATE INDEX idx_messages_scheduled_at ON public.messages(scheduled_at);
CREATE INDEX idx_sms_logs_message_id ON public.sms_logs(message_id);
CREATE INDEX idx_sms_logs_status ON public.sms_logs(status);