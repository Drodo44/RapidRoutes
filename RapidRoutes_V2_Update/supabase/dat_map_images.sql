-- Add table for storing DAT heat map images
create table if not exists dat_map_images (
  id uuid primary key default gen_random_uuid(),
  equipment_type text not null,
  image_url text not null,
  uploaded_at timestamptz default now(),
  file_size bigint,
  mime_type text,
  created_at timestamptz default now()
);

-- Index for faster queries
create index if not exists idx_dat_map_images_equipment on dat_map_images(equipment_type);
create index if not exists idx_dat_map_images_uploaded_at on dat_map_images(uploaded_at);

-- RLS
alter table dat_map_images enable row level security;

create policy "Users can view all map images" on dat_map_images for select using (true);
create policy "Users can insert map images" on dat_map_images for insert with check (true);
