-- Alert subscriptions: email + city, unique pair
create table if not exists alerts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  city        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint alerts_email_city_key unique (email, city)
);

-- Disable RLS for service-role writes (API route uses service role key)
alter table alerts enable row level security;

-- Allow public INSERT (anon key) for form submissions
create policy "Public can insert alerts"
  on alerts for insert
  to anon
  with check (true);

-- Deny all reads from anon
create policy "Only service role can read alerts"
  on alerts for select
  to authenticated
  using (true);
