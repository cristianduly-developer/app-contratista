-- ══════════════════════════════════════════════════════════════
-- Security fixes — App Contratista (idempotente)
-- ══════════════════════════════════════════════════════════════

-- 1) Paywall RESTRICTIVE en adicionales_gremio (faltaba)
DROP POLICY IF EXISTS "paywall_insert_adicionales_gremio" ON adicionales_gremio;
CREATE POLICY "paywall_insert_adicionales_gremio" ON adicionales_gremio AS RESTRICTIVE
  FOR INSERT WITH CHECK (tiene_acceso());

DROP POLICY IF EXISTS "paywall_update_adicionales_gremio" ON adicionales_gremio;
CREATE POLICY "paywall_update_adicionales_gremio" ON adicionales_gremio AS RESTRICTIVE
  FOR UPDATE USING (tiene_acceso());

DROP POLICY IF EXISTS "paywall_delete_adicionales_gremio" ON adicionales_gremio;
CREATE POLICY "paywall_delete_adicionales_gremio" ON adicionales_gremio AS RESTRICTIVE
  FOR DELETE USING (tiene_acceso());

-- 2) Revocar SELECT a anon en obras_resumen
REVOKE SELECT ON obras_resumen FROM anon;
