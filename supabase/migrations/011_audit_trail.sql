-- ================================================================
-- AUDIT TRAIL para tablas financieras
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- 1. Tabla de auditoría
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  operacion   text not null, -- INSERT / UPDATE / DELETE
  registro_id uuid not null,
  user_id     uuid,
  obra_id     uuid,
  datos_antes jsonb,
  datos_despues jsonb,
  ip          text,
  created_at  timestamptz default now()
);

create index audit_log_tabla_idx on audit_log(tabla, created_at desc);
create index audit_log_user_idx on audit_log(user_id, created_at desc);
create index audit_log_obra_idx on audit_log(obra_id, created_at desc);

alter table audit_log enable row level security;
create policy "audit propio" on audit_log
  for select using (auth.uid() = user_id);

-- 2. Función genérica de auditoría
create or replace function fn_audit_financiero()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_obra_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_user_id := OLD.user_id;
    v_obra_id := OLD.obra_id;
    insert into audit_log (tabla, operacion, registro_id, user_id, obra_id, datos_antes)
    values (TG_TABLE_NAME, 'DELETE', OLD.id, v_user_id, v_obra_id, to_jsonb(OLD));
    return OLD;
  elsif TG_OP = 'UPDATE' then
    v_user_id := NEW.user_id;
    v_obra_id := NEW.obra_id;
    insert into audit_log (tabla, operacion, registro_id, user_id, obra_id, datos_antes, datos_despues)
    values (TG_TABLE_NAME, 'UPDATE', NEW.id, v_user_id, v_obra_id, to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'INSERT' then
    v_user_id := NEW.user_id;
    v_obra_id := NEW.obra_id;
    insert into audit_log (tabla, operacion, registro_id, user_id, obra_id, datos_despues)
    values (TG_TABLE_NAME, 'INSERT', NEW.id, v_user_id, v_obra_id, to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- 3. Triggers en tablas financieras

-- Pagos a gremios
drop trigger if exists trg_audit_pagos_gremios on pagos_gremios;
create trigger trg_audit_pagos_gremios
  after insert or update or delete on pagos_gremios
  for each row execute function fn_audit_financiero();

-- Cobros del inversor
drop trigger if exists trg_audit_cobros_inversor on cobros_inversor;
create trigger trg_audit_cobros_inversor
  after insert or update or delete on cobros_inversor
  for each row execute function fn_audit_financiero();

-- Comprobantes
drop trigger if exists trg_audit_comprobantes on comprobantes_obra;
create trigger trg_audit_comprobantes
  after insert or update or delete on comprobantes_obra
  for each row execute function fn_audit_financiero();

-- Montos acordados con gremios (cambios en obra_gremios)
drop trigger if exists trg_audit_obra_gremios on obra_gremios;
create trigger trg_audit_obra_gremios
  after insert or update or delete on obra_gremios
  for each row execute function fn_audit_financiero();
