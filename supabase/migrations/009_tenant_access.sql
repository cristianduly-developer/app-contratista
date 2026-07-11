-- ================================================================
-- TENANT_ACCESS — control de acceso por suscripción
-- Mismo patrón que App-presup / todas las apps SaaS
-- ================================================================

create table if not exists tenant_access (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  valid_until timestamptz not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id)
);

alter table tenant_access enable row level security;

create policy "tenant_access select propio" on tenant_access
  for select using (auth.uid() = user_id);

create index tenant_access_user_idx on tenant_access(user_id);

-- ================================================================
-- tiene_acceso() — SECURITY DEFINER para que las RESTRICTIVE
-- policies puedan consultarla sin que RLS bloquee la lectura
-- ================================================================
create or replace function tiene_acceso()
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from tenant_access
    where user_id = auth.uid()
      and valid_until > now()
  );
end;
$$;
