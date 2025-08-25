-- Add recap tracking table to existing schema
-- This tracks performance of posted lane pairs

-- lane_postings: Tracks what was actually posted to DAT for each lane
create table if not exists lane_postings (
  id uuid primary key default gen_random_uuid(),
  lane_id uuid not null references lanes(id) on delete cascade,
  pickup_city text not null,
  pickup_state text not null,
  pickup_zip text,
  delivery_city text not null,
  delivery_state text not null,
  delivery_zip text,
  posted_at timestamptz default now(),
  created_at timestamptz default now()
);

-- recap_tracking: Tracks performance of posted pairs
create table if not exists recap_tracking (
  id uuid primary key default gen_random_uuid(),
  lane_posting_id uuid not null references lane_postings(id) on delete cascade,
  lane_id uuid not null references lanes(id) on delete cascade,
  action_type text check (action_type in ('email', 'call', 'covered')) not null,
  pickup_distance_miles numeric,
  delivery_distance_miles numeric,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_lane_postings_lane_id on lane_postings(lane_id);
create index if not exists idx_recap_tracking_lane_id on recap_tracking(lane_id);
create index if not exists idx_recap_tracking_posting_id on recap_tracking(lane_posting_id);
create index if not exists idx_recap_tracking_action_type on recap_tracking(action_type);
create index if not exists idx_recap_tracking_created_at on recap_tracking(created_at);

-- Row Level Security
alter table lane_postings enable row level security;
alter table recap_tracking enable row level security;

-- RLS Policies (basic - adjust as needed for your auth setup)
create policy "Users can view all lane postings" on lane_postings for select using (true);
create policy "Users can insert lane postings" on lane_postings for insert with check (true);
create policy "Users can update their own lane postings" on lane_postings for update using (true);

create policy "Users can view all recap tracking" on recap_tracking for select using (true);
create policy "Users can insert recap tracking" on recap_tracking for insert with check (true);
create policy "Users can update their own recap tracking" on recap_tracking for update using (true);
