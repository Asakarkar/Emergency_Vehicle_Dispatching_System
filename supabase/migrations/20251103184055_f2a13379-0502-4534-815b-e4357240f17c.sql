-- Add depot flags to zip_codes table
ALTER TABLE public.zip_codes 
ADD COLUMN is_ambulance_depot boolean DEFAULT false,
ADD COLUMN is_fire_truck_depot boolean DEFAULT false,
ADD COLUMN is_police_depot boolean DEFAULT false;

-- Set specific cities as depots for each vehicle type
-- 10001 (Manhattan Central) as ambulance depot
UPDATE public.zip_codes SET is_ambulance_depot = true WHERE code = '10001';

-- 10003 (East Village) as fire truck depot
UPDATE public.zip_codes SET is_fire_truck_depot = true WHERE code = '10003';

-- 10006 (Tribeca) as police depot
UPDATE public.zip_codes SET is_police_depot = true WHERE code = '10006';