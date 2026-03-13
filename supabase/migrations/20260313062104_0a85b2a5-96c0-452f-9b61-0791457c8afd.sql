
CREATE TABLE public.wallet_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  chain_id INTEGER,
  last_connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read/insert/update since we use wallet address as identity (no auth.users)
ALTER TABLE public.wallet_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wallet_users" ON public.wallet_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert wallet_users" ON public.wallet_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wallet_users" ON public.wallet_users FOR UPDATE USING (true) WITH CHECK (true);
