
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING ((auth.jwt() ->> 'sub')::uuid = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING ((auth.jwt() ->> 'sub')::uuid = id) 
WITH CHECK ((auth.jwt() ->> 'sub')::uuid = id);
