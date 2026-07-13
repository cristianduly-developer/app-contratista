-- ================================================================
-- ADICIONALES POR GREMIO EN OBRA
-- Permite registrar costos extra sobre el monto_acordado original
-- ================================================================

create table if not exists adicionales_gremio (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references perfiles(id) on delete cascade,
  obra_id        uuid not null references obras(id) on delete cascade,
  gremio_id      uuid not null references gremios(id) on delete cascade,
  obra_gremio_id uuid not null references obra_gremios(id) on delete cascade,
  monto          numeric not null,
  motivo         text not null default '',
  fecha          date not null default current_date,
  created_at     timestamptz default now()
);

alter table adicionales_gremio enable row level security;

create policy "adicionales propios" on adicionales_gremio
  for all using (auth.uid() = user_id);

create index adicionales_gremio_og_idx on adicionales_gremio(obra_gremio_id);
create index adicionales_gremio_obra_idx on adicionales_gremio(obra_id);

-- Audit trail trigger (reusa fn_audit_financiero existente)
create trigger audit_adicionales_gremio
  after insert or update or delete on adicionales_gremio
  for each row execute function fn_audit_financiero();

-- ================================================================
-- Actualizar vista obras_resumen para incluir adicionales
-- DROP necesario porque se agregan columnas nuevas
-- ================================================================
drop view if exists obras_resumen;
create view obras_resumen with (security_invoker = true) as
select
  o.id,
  o.user_id,
  o.nombre,
  o.status,
  o.precio_inversor,
  o.m2,
  o.porcentaje_avance,
  o.cliente_nombre,
  o.direccion,
  o.fecha_inicio,
  o.fecha_fin_estimada,
  coalesce(ci.cobrado, 0)          as cobrado_inversor,
  o.precio_inversor - coalesce(ci.cobrado, 0) as pendiente_cobrar,
  coalesce(pg.pagado, 0)           as pagado_gremios,
  coalesce(og.acordado, 0)         as acordado_gremios,
  coalesce(ad.total_adicionales, 0) as total_adicionales,
  coalesce(og.acordado, 0) + coalesce(ad.total_adicionales, 0) as costo_real_gremios,
  coalesce(og.acordado, 0) + coalesce(ad.total_adicionales, 0) - coalesce(pg.pagado, 0) as pendiente_pagar,
  coalesce(mat.total_mat, 0)       as total_materiales,
  coalesce(ci.cobrado, 0) - coalesce(pg.pagado, 0) - coalesce(mat.total_mat, 0) as ganancia_neta,
  coalesce(al.alertas_pendientes, 0) as alertas_pendientes
from obras o
left join lateral (select sum(monto) as cobrado from cobros_inversor where obra_id = o.id) ci on true
left join lateral (select sum(monto) as pagado from pagos_gremios where obra_id = o.id) pg on true
left join lateral (select sum(monto_acordado) as acordado from obra_gremios where obra_id = o.id) og on true
left join lateral (select sum(monto) as total_adicionales from adicionales_gremio where obra_id = o.id) ad on true
left join lateral (select sum(costo) as total_mat from materiales_obra where obra_id = o.id) mat on true
left join lateral (select count(*) as alertas_pendientes from alertas_obra where obra_id = o.id and not resuelta) al on true;

-- ================================================================
-- Actualizar vista gremios_resumen para incluir adicionales
-- ================================================================
drop view if exists gremios_resumen;
create view gremios_resumen with (security_invoker = true) as
select
  g.id,
  g.user_id,
  g.nombre,
  g.tipo,
  g.telefono,
  g.token_link,
  coalesce(sum(og.monto_acordado), 0)                        as total_acordado,
  coalesce(sum(ad.adicionales), 0)                           as total_adicionales,
  coalesce(sum(og.monto_acordado), 0) + coalesce(sum(ad.adicionales), 0) as total_real,
  coalesce(sum(pg.pagado), 0)                                as total_pagado,
  coalesce(sum(og.monto_acordado), 0) + coalesce(sum(ad.adicionales), 0) - coalesce(sum(pg.pagado), 0) as saldo_pendiente,
  count(distinct og.obra_id) filter (where ow.status = 'en_ejecucion') as obras_activas
from gremios g
left join obra_gremios og on og.gremio_id = g.id
left join obras ow on ow.id = og.obra_id
left join lateral (select sum(monto) as pagado from pagos_gremios where gremio_id = g.id and obra_id = og.obra_id) pg on true
left join lateral (select sum(monto) as adicionales from adicionales_gremio where gremio_id = g.id and obra_id = og.obra_id) ad on true
group by g.id;

-- ================================================================
-- Actualizar RPC link público para incluir adicionales
-- ================================================================
create or replace function obtener_datos_gremio_por_token(p_token text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_gremio record;
  v_result jsonb;
begin
  select g.id, g.nombre, g.tipo, g.user_id,
         p.nombre as contratista_nombre, p.telefono as contratista_telefono
  into v_gremio
  from gremios g
  join perfiles p on p.id = g.user_id
  where g.token_link = p_token;

  if not found then
    return jsonb_build_object('error', 'token_invalido');
  end if;

  v_result := jsonb_build_object(
    'gremio', jsonb_build_object(
      'id', v_gremio.id,
      'nombre', v_gremio.nombre,
      'tipo', v_gremio.tipo,
      'contratista', v_gremio.contratista_nombre,
      'contratista_tel', v_gremio.contratista_telefono
    ),
    'obras', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'obra_nombre', o.nombre,
        'obra_direccion', o.direccion,
        'obra_status', o.status,
        'status', og.status,
        'monto_acordado', og.monto_acordado,
        'total_adicionales', coalesce(ad.total_ad, 0),
        'costo_real', og.monto_acordado + coalesce(ad.total_ad, 0),
        'total_pagado', coalesce(pg.pagado, 0),
        'saldo', og.monto_acordado + coalesce(ad.total_ad, 0) - coalesce(pg.pagado, 0),
        'adicionales', coalesce(ad.detalle, '[]'::jsonb),
        'pagos', coalesce(pay.pagos, '[]'::jsonb),
        'fotos', coalesce(f.fotos, '[]'::jsonb),
        'notas', coalesce(n.notas, '[]'::jsonb)
      )), '[]'::jsonb)
      from obra_gremios og
      join obras o on o.id = og.obra_id
      left join lateral (
        select sum(monto) as pagado from pagos_gremios
        where gremio_id = v_gremio.id and obra_id = og.obra_id
      ) pg on true
      left join lateral (
        select sum(monto) as total_ad,
               jsonb_agg(jsonb_build_object('monto', monto, 'motivo', motivo, 'fecha', fecha) order by fecha desc) as detalle
        from adicionales_gremio
        where gremio_id = v_gremio.id and obra_id = og.obra_id
      ) ad on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('monto', monto, 'fecha', fecha, 'metodo', metodo) order by fecha desc) as pagos
        from pagos_gremios where gremio_id = v_gremio.id and obra_id = og.obra_id
      ) pay on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('url', url, 'descripcion', descripcion, 'fecha', created_at) order by created_at desc) as fotos
        from fotos_obra where gremio_id = v_gremio.id and obra_id = og.obra_id
      ) f on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('texto', texto, 'fecha', created_at) order by created_at desc) as notas
        from notas_obra where gremio_id = v_gremio.id and obra_id = og.obra_id
      ) n on true
    )
  );

  return v_result;
end;
$$;
