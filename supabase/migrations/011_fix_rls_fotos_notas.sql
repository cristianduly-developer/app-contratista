-- Fix: eliminar policies SELECT abiertas (using(true)) que permiten
-- que cualquier usuario autenticado lea fotos/notas de todos.
-- El link público de gremios usa un RPC SECURITY DEFINER que bypasea RLS,
-- así que no necesita esta policy abierta.

drop policy if exists "fotos por token gremio" on fotos_obra;
drop policy if exists "notas por token gremio" on notas_obra;
