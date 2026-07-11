-- ================================================================
-- Indexes de performance + trigger updated_at
-- (los indexes principales ya están en schema.sql, estos son extra)
-- ================================================================

-- Pagos por fecha (Vista Viernes)
create index if not exists pagos_gremios_fecha_idx on pagos_gremios(fecha);
create index if not exists cobros_inversor_fecha_idx on cobros_inversor(fecha);

-- Obras por status (filtros rápidos)
create index if not exists obras_status_idx on obras(user_id, status);

-- Fotos y notas por gremio (link público)
create index if not exists fotos_gremio_idx on fotos_obra(gremio_id);
create index if not exists notas_gremio_idx on notas_obra(gremio_id);

-- Alertas pendientes
create index if not exists alertas_pendientes_idx on alertas_obra(obra_id) where not resuelta;
