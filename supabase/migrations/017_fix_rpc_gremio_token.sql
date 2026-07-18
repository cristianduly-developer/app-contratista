-- ================================================================
-- FIX: obtener_datos_gremio_por_token no filtraba por gremio_id
-- en obra_gremios, mostrando obras de TODOS los usuarios
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
      where og.gremio_id = v_gremio.id
    )
  );

  return v_result;
end;
$$;
