-- ================================================================
-- RESTRICTIVE paywall policies — bloquean INSERT/UPDATE si el
-- usuario no tiene suscripción activa (tiene_acceso() = false)
-- Mismo patrón que App-presup 010_tenant_access_enforce.sql
-- ================================================================

-- OBRAS
create policy "paywall_insert_obras" on obras as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_obras" on obras as restrictive
  for update using (tiene_acceso());

-- GREMIOS
create policy "paywall_insert_gremios" on gremios as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_gremios" on gremios as restrictive
  for update using (tiene_acceso());

-- OBRA_GREMIOS
create policy "paywall_insert_obra_gremios" on obra_gremios as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_obra_gremios" on obra_gremios as restrictive
  for update using (tiene_acceso());

-- PAGOS_GREMIOS
create policy "paywall_insert_pagos_gremios" on pagos_gremios as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_pagos_gremios" on pagos_gremios as restrictive
  for update using (tiene_acceso());

-- COBROS_INVERSOR
create policy "paywall_insert_cobros_inversor" on cobros_inversor as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_cobros_inversor" on cobros_inversor as restrictive
  for update using (tiene_acceso());

-- MATERIALES_OBRA
create policy "paywall_insert_materiales_obra" on materiales_obra as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_materiales_obra" on materiales_obra as restrictive
  for update using (tiene_acceso());

-- FOTOS_OBRA
create policy "paywall_insert_fotos_obra" on fotos_obra as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_fotos_obra" on fotos_obra as restrictive
  for update using (tiene_acceso());

-- NOTAS_OBRA
create policy "paywall_insert_notas_obra" on notas_obra as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_notas_obra" on notas_obra as restrictive
  for update using (tiene_acceso());

-- ALERTAS_OBRA
create policy "paywall_insert_alertas_obra" on alertas_obra as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_alertas_obra" on alertas_obra as restrictive
  for update using (tiene_acceso());

-- PRECIOS_M2
create policy "paywall_insert_precios_m2" on precios_m2 as restrictive
  for insert with check (tiene_acceso());
create policy "paywall_update_precios_m2" on precios_m2 as restrictive
  for update using (tiene_acceso());
