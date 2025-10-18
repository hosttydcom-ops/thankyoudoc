    -- Create membership plans table
    create table if not exists public.membership_plans (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        description text,
        price_in_inr numeric(10,2) not null check (price_in_inr >= 0),
        duration_months integer not null check (duration_months > 0),
        appointments_included integer not null default 0 check (appointments_included >= 0),
        benefits jsonb,
        is_active boolean not null default true,
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone default now()
    );

    -- Trigger to update updated_at
    create or replace function public.set_updated_at()
    returns trigger as $$
    begin
        new.updated_at = now();
        return new;
    end;
    $$ language plpgsql;

    drop trigger if exists membership_plans_set_updated_at on public.membership_plans;
    create trigger membership_plans_set_updated_at
    before update on public.membership_plans
    for each row execute function public.set_updated_at();

    -- RLS
    alter table public.membership_plans enable row level security;

    -- Allow moderators (and above) full access, and read for authenticated
    create policy membership_plans_read on public.membership_plans
    for select
    to authenticated
    using (true);

create policy membership_plans_write on public.membership_plans
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('moderator','admin')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('moderator','admin')
  )
);

    -- Helpful indexes
    create index if not exists idx_membership_plans_active on public.membership_plans(is_active);
    create index if not exists idx_membership_plans_name on public.membership_plans using gin (to_tsvector('english', name));

