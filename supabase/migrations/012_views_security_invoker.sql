-- Fix C3: las views obras_resumen y gremios_resumen corren como DEFINER
-- y bypassean RLS. Con security_invoker = true respetan las políticas
-- del usuario que ejecuta la query.

alter view obras_resumen set (security_invoker = true);
alter view gremios_resumen set (security_invoker = true);
