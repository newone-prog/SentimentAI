-- Run this in your Supabase SQL Editor to fix the RLS block and allow the frontend to insert subscriptions!
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- This policy explicitly allows anyone (the anon key) to beautifully insert a new row into the table
CREATE POLICY "Enable insert for anonymous users" 
ON public.newsletter_subscriptions 
FOR INSERT 
TO anon 
WITH CHECK (true);
