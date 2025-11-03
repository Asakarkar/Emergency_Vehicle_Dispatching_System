-- Create enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM ('ambulance', 'fire_truck', 'police');

-- Create zip_codes table
CREATE TABLE public.zip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  ambulance_count INTEGER NOT NULL DEFAULT 0 CHECK (ambulance_count >= 0),
  fire_truck_count INTEGER NOT NULL DEFAULT 0 CHECK (fire_truck_count >= 0),
  police_count INTEGER NOT NULL DEFAULT 0 CHECK (police_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create edges table for graph connections
CREATE TABLE public.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_zip_id UUID NOT NULL REFERENCES public.zip_codes(id) ON DELETE CASCADE,
  dest_zip_id UUID NOT NULL REFERENCES public.zip_codes(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL CHECK (weight > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_zip_id, dest_zip_id)
);

-- Create dispatch_logs table
CREATE TABLE public.dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type vehicle_type NOT NULL,
  source_zip_code TEXT NOT NULL,
  dest_zip_code TEXT NOT NULL,
  path JSONB NOT NULL,
  distance INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (public read access for this emergency system)
CREATE POLICY "Allow public read access to zip_codes"
  ON public.zip_codes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to edges"
  ON public.edges FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to dispatch_logs"
  ON public.dispatch_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to dispatch_logs"
  ON public.dispatch_logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to zip_codes"
  ON public.zip_codes FOR UPDATE
  TO public
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_edges_source ON public.edges(source_zip_id);
CREATE INDEX idx_edges_dest ON public.edges(dest_zip_id);
CREATE INDEX idx_dispatch_logs_created ON public.dispatch_logs(created_at DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.zip_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_logs;