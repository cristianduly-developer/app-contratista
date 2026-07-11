-- ================================================================
-- APP-CONTRATISTA · Schema completo
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

create extension if not exists "uuid-ossp";

-- ================================================================
-- PERFILES DE USUARIO
-- ================================================================
create table if not exists perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null default '',
  telefono      text default '',
  email         text default '',
  ciudad        text default '',
  plan          text default 'trial',
  created_at    timestamptz default now()
);

alter table perfiles enable row level security;
create policy "perfil propio" on perfiles
  for all using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ================================================================
-- PRECIOS POR M² (configuración del contratista)
-- ================================================================
create table if not exists precios_m2 (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references perfiles(id) on delete cascade,
  tipo_gremio   text not null,
  precio_por_m2 numeric not null default 0,
  created_at    timestamptz default now(),
  unique(user_id, tipo_gremio)
);

alter table precios_m2 enable row level security;
create policy "precios propios" on precios_m2
  for all using (auth.uid() = user_id);

-- ================================================================
-- OBRAS
-- ================================================================
create table if not exists obras (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references perfiles(id) on delete cascade,
  nombre              text not null,
  direccion           text default '',
  m2                  numeric default 0,
  cliente_nombre      text default '',
  precio_inversor     numeric default 0,
  status              text not null default 'presupuestada',
    -- presupuestada | en_ejecucion | finalizada | cobrada
  porcentaje_avance   int default 0,
  fecha_inicio        date,
  fecha_fin_estimada  date,
  color               text default '#F97316',
  notas               text default '',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table obras enable row level security;
create policy "obras propias" on obras
  for all using (auth.uid() = user_id);

create index obras_user_idx on obras(user_id);

-- ================================================================
-- GREMIOS (subcontratistas)
-- ================================================================
create table if not exists gremios (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  nombre      text not null,
  tipo        text default '',
  telefono    text default '',
  token_link  text unique default encode(gen_random_bytes(16), 'hex'),
  created_at  timestamptz default now()
);

alter table gremios enable row level security;
create policy "gremios propios" on gremios
  for all using (auth.uid() = user_id);

create index gremios_user_idx on gremios(user_id);
create index gremios_token_idx on gremios(token_link);

-- ================================================================
-- ASIGNACIÓN GREMIO ↔ OBRA
-- ================================================================
create table if not exists obra_gremios (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references perfiles(id) on delete cascade,
  obra_id        uuid not null references obras(id) on delete cascade,
  gremio_id      uuid not null references gremios(id) on delete cascade,
  monto_acordado numeric default 0,
  status         text default 'pendiente',
    -- pendiente | en_trabajo | terminado
  created_at     timestamptz default now(),
  unique(obra_id, gremio_id)
);

alter table obra_gremios enable row level security;
create policy "obra_gremios propios" on obra_gremios
  for all using (auth.uid() = user_id);

create index obra_gremios_obra_idx on obra_gremios(obra_id);
create index obra_gremios_gremio_idx on obra_gremios(gremio_id);

-- ================================================================
-- PAGOS A GREMIOS
-- ================================================================
create table if not exists pagos_gremios (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references perfiles(id) on delete cascade,
  obra_id    uuid not null references obras(id) on delete cascade,
  gremio_id  uuid not null references gremios(id) on delete cascade,
  monto      numeric not null,
  fecha      date not null default current_date,
  metodo     text default 'efectivo',
  notas      text default '',
  created_at timestamptz default now()
);

alter table pagos_gremios enable row level security;
create policy "pagos_gremios propios" on pagos_gremios
  for all using (auth.uid() = user_id);

create index pagos_gremios_obra_idx on pagos_gremios(obra_id);
create index pagos_gremios_gremio_idx on pagos_gremios(gremio_id);

-- ================================================================
-- COBROS DEL INVERSOR
-- ================================================================
create table if not exists cobros_inversor (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references perfiles(id) on delete cascade,
  obra_id    uuid not null references obras(id) on delete cascade,
  monto      numeric not null,
  fecha      date not null default current_date,
  metodo     text default 'efectivo',
  notas      text default '',
  created_at timestamptz default now()
);

alter table cobros_inversor enable row level security;
create policy "cobros propios" on cobros_inversor
  for all using (auth.uid() = user_id);

create index cobros_inversor_obra_idx on cobros_inversor(obra_id);

-- ================================================================
-- MATERIALES POR OBRA
-- ================================================================
create table if not exists materiales_obra (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  descripcion text not null,
  costo       numeric not null default 0,
  proveedor   text default '',
  fecha       date default current_date,
  created_at  timestamptz default now()
);

alter table materiales_obra enable row level security;
create policy "materiales propios" on materiales_obra
  for all using (auth.uid() = user_id);

create index materiales_obra_idx on materiales_obra(obra_id);

-- ================================================================
-- FOTOS DE OBRA
-- ================================================================
create table if not exists fotos_obra (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  gremio_id   uuid references gremios(id) on delete set null,
  url         text not null,
  descripcion text default '',
  created_at  timestamptz default now()
);

alter table fotos_obra enable row level security;
create policy "fotos propias" on fotos_obra
  for all using (auth.uid() = user_id);
-- acceso público por gremio (sin auth, para el link)
create policy "fotos por token gremio" on fotos_obra
  for select using (true);

create index fotos_obra_idx on fotos_obra(obra_id);

-- storage bucket
insert into storage.buckets (id, name, public)
values ('fotos-obras', 'fotos-obras', true)
on conflict do nothing;

create policy "fotos upload" on storage.objects
  for insert with check (bucket_id = 'fotos-obras' and auth.uid() is not null);
create policy "fotos select" on storage.objects
  for select using (bucket_id = 'fotos-obras');

-- ================================================================
-- NOTAS DE OBRA
-- ================================================================
create table if not exists notas_obra (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references perfiles(id) on delete cascade,
  obra_id    uuid not null references obras(id) on delete cascade,
  gremio_id  uuid references gremios(id) on delete set null,
  texto      text not null,
  created_at timestamptz default now()
);

alter table notas_obra enable row level security;
create policy "notas propias" on notas_obra
  for all using (auth.uid() = user_id);
create policy "notas por token gremio" on notas_obra
  for select using (true);

create index notas_obra_idx on notas_obra(obra_id);

-- ================================================================
-- ALERTAS DE OBRA
-- ================================================================
create table if not exists alertas_obra (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  descripcion text not null,
  resuelta    boolean default false,
  created_at  timestamptz default now()
);

alter table alertas_obra enable row level security;
create policy "alertas propias" on alertas_obra
  for all using (auth.uid() = user_id);

create index alertas_obra_idx on alertas_obra(obra_id);

-- ================================================================
-- TRIGGER updated_at
-- ================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_obras_updated_at
  before update on obras
  for each row execute function set_updated_at();

-- ================================================================
-- VISTAS ÚTILES
-- ================================================================

-- Resumen financiero por obra
create or replace view obras_resumen as
select
  o.id,
  o.user_id,
  o.nombre,
  o.status,
  o.precio_inversor,
  o.m2,
  o.porcentaje_avance,
  o.cliente_nombre,
  o.fecha_inicio,
  o.fecha_fin_estimada,
  coalesce(ci.cobrado, 0)          as cobrado_inversor,
  o.precio_inversor - coalesce(ci.cobrado, 0) as pendiente_cobrar,
  coalesce(pg.pagado, 0)           as pagado_gremios,
  coalesce(og.acordado, 0)         as acordado_gremios,
  coalesce(og.acordado, 0) - coalesce(pg.pagado, 0) as pendiente_pagar,
  coalesce(mat.total_mat, 0)       as total_materiales,
  coalesce(ci.cobrado, 0) - coalesce(pg.pagado, 0) - coalesce(mat.total_mat, 0) as ganancia_neta,
  coalesce(al.alertas_pendientes, 0) as alertas_pendientes
from obras o
left join lateral (select sum(monto) as cobrado from cobros_inversor where obra_id = o.id) ci on true
left join lateral (select sum(monto) as pagado from pagos_gremios where obra_id = o.id) pg on true
left join lateral (select sum(monto_acordado) as acordado from obra_gremios where obra_id = o.id) og on true
left join lateral (select sum(costo) as total_mat from materiales_obra where obra_id = o.id) mat on true
left join lateral (select count(*) as alertas_pendientes from alertas_obra where obra_id = o.id and not resuelta) al on true;

-- Resumen por gremio (todas las obras)
create or replace view gremios_resumen as
select
  g.id,
  g.user_id,
  g.nombre,
  g.tipo,
  g.telefono,
  g.token_link,
  coalesce(sum(og.monto_acordado), 0)                        as total_acordado,
  coalesce(sum(pg.pagado), 0)                                as total_pagado,
  coalesce(sum(og.monto_acordado), 0) - coalesce(sum(pg.pagado), 0) as saldo_pendiente,
  count(distinct og.obra_id) filter (where ow.status = 'en_ejecucion') as obras_activas
from gremios g
left join obra_gremios og on og.gremio_id = g.id
left join obras ow on ow.id = og.obra_id
left join lateral (select sum(monto) as pagado from pagos_gremios where gremio_id = g.id and obra_id = og.obra_id) pg on true
group by g.id;

-- ================================================================
-- RPC: crear obra con límite de plan
-- ================================================================
create or replace function crear_obra_con_limite(
  p_user_id          uuid,
  p_nombre           text,
  p_direccion        text default '',
  p_m2               numeric default 0,
  p_cliente_nombre   text default '',
  p_precio_inversor  numeric default 0,
  p_fecha_inicio     date default null,
  p_fecha_fin_est    date default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count  integer;
  v_limite integer;
  v_plan   text;
  v_id     uuid;
begin
  select plan into v_plan from perfiles where id = p_user_id;

  v_limite := case v_plan
    when 'basico' then 3
    when 'demo'   then 999
    when 'profesional' then 999
    when 'premium' then 999
    else 2
  end;

  select count(*) into v_count
  from obras
  where user_id = p_user_id and status not in ('finalizada', 'cobrada');

  if v_count >= v_limite then
    raise exception 'LIMITE_PLAN: Alcanzaste el límite de % obras activas del plan %', v_limite, coalesce(v_plan, 'sin plan');
  end if;

  v_id := gen_random_uuid();

  insert into obras (id, user_id, nombre, direccion, m2, cliente_nombre, precio_inversor, fecha_inicio, fecha_fin_estimada)
  values (v_id, p_user_id, p_nombre, p_direccion, p_m2, p_cliente_nombre, p_precio_inversor, p_fecha_inicio, p_fecha_fin_est);

  return jsonb_build_object('id', v_id);
end;
$$;
