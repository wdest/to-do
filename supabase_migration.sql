-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    is_done BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    reminder_at TIMESTAMP WITH TIME ZONE
);

-- Turn off RLS for now since we rely on Frontend PIN (Or you can enable it and create an anonymous policy)
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
