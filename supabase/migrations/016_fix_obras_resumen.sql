-- ================================================================
-- FIX: obras_resumen faltaba created_at y grants post-DROP
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
  o.created_at,
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

-- Restaurar grants que se perdieron con el DROP
grant select on obras_resumen to authenticated;
grant select on obras_resumen to anon;
