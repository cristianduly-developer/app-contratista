-- ══════════════════════════════════════════════════════════════
-- Fix C4: Rate limit en obtener_datos_gremio_por_token
-- Evita scraping masivo de tokens de gremios.
-- Usa tabla rate_limit_gremio con purga probabilística.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limit_gremio (
  id         BIGSERIAL PRIMARY KEY,
  ip_hash    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rate_limit_gremio ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rlg_ip_created ON rate_limit_gremio(ip_hash, created_at);

-- Reescribir el RPC con rate limit interno
CREATE OR REPLACE FUNCTION obtener_datos_gremio_por_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gremio record;
  v_result jsonb;
  v_ip text;
  v_count int;
BEGIN
  -- Rate limit: max 30 llamadas por IP por hora
  v_ip := coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown');
  v_ip := md5(split_part(v_ip, ',', 1));

  SELECT count(*) INTO v_count
  FROM rate_limit_gremio
  WHERE ip_hash = v_ip AND created_at > now() - interval '1 hour';

  IF v_count >= 30 THEN
    RETURN jsonb_build_object('error', 'rate_limit');
  END IF;

  INSERT INTO rate_limit_gremio (ip_hash) VALUES (v_ip);

  -- Purga probabilística (1 de cada 20)
  IF random() < 0.05 THEN
    DELETE FROM rate_limit_gremio WHERE created_at < now() - interval '2 hours';
  END IF;

  -- Lógica original
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
        'status', og.status,
        'monto_acordado', og.monto_acordado,
        'total_pagado', coalesce(pg.pagado, 0),
        'saldo', og.monto_acordado - coalesce(pg.pagado, 0),
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
