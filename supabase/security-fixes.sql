-- ══════════════════════════════════════════════════════════════
-- Security fixes — App Contratista
-- ══════════════════════════════════════════════════════════════

-- 1) Paywall RESTRICTIVE en adicionales_gremio (faltaba)
CREATE POLICY "paywall_insert_adicionales_gremio" ON adicionales_gremio AS RESTRICTIVE
  FOR INSERT WITH CHECK (tiene_acceso());
CREATE POLICY "paywall_update_adicionales_gremio" ON adicionales_gremio AS RESTRICTIVE
  FOR UPDATE USING (tiene_acceso());

-- 2) Paywall RESTRICTIVE para DELETE en todas las tablas
CREATE POLICY "paywall_delete_obras" ON obras AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_gremios" ON gremios AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_obra_gremios" ON obra_gremios AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_pagos_gremios" ON pagos_gremios AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_cobros_inversor" ON cobros_inversor AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_materiales_obra" ON materiales_obra AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_fotos_obra" ON fotos_obra AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_notas_obra" ON notas_obra AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_alertas_obra" ON alertas_obra AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_precios_m2" ON precios_m2 AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());
CREATE POLICY "paywall_delete_adicionales_gremio" ON adicionales_gremio AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());

-- 3) Revocar SELECT a anon en obras_resumen
REVOKE SELECT ON obras_resumen FROM anon;
