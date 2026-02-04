-- lane_interest: Tracks call/email activity per lane
create table if not exists lane_interest (
  id uuid primary key default gen_random_uuid(),
  lane_id uuid not null,
  user_id uuid,
  type text check (type in ('call', 'email')),
  created_at timestamptz default now()
);

-- kma_feedback: Tracks user KMA corrections
create table if not exists kma_feedback (
  id uuid primary key default gen_random_uuid(),
  city text,
  state text,
  zip text,
  suggested_kma text,
  confidence text,
  confirmed_by text,
  created_at timestamptz default now()
);

-- quizzes: Stores quiz metadata
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  created_at timestamptz default now()
);

-- quiz_attempts: User quiz tracking
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  quiz_id uuid,
  score integer,
  total integer,
  created_at timestamptz default now()
);

-- lane_versions: Tracks all posted or edited lanes
create table if not exists lane_versions (
  id uuid primary key default gen_random_uuid(),
  lane_id uuid,
  version jsonb,
  created_by uuid,
  created_at timestamptz default now()
);
