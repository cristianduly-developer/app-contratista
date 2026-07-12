-- Fix C1: El plan se lee de perfiles.plan que el usuario puede editar.
-- Mover la fuente de verdad a tenant_access.plan (actualizado solo por webhook MP).

-- 1. Agregar columna plan a tenant_access
ALTER TABLE tenant_access ADD COLUMN IF NOT EXISTS plan text DEFAULT 'basico';

-- 2. Migrar planes existentes desde perfiles
UPDATE tenant_access ta
SET plan = p.plan
FROM perfiles p
WHERE p.id = ta.user_id AND p.plan IS NOT NULL AND p.plan != 'trial';

-- 3. Modificar RPC para leer plan de tenant_access (no de perfiles)
CREATE OR REPLACE FUNCTION crear_obra_con_limite(
  p_user_id          uuid,
  p_nombre           text,
  p_direccion        text default '',
  p_m2               numeric default 0,
  p_cliente_nombre   text default '',
  p_precio_inversor  numeric default 0,
  p_fecha_inicio     date default null,
  p_fecha_fin_est    date default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count  integer;
  v_limite integer;
  v_plan   text;
  v_id     uuid;
BEGIN
  -- Leer plan de tenant_access (fuente de verdad, no editable por usuario)
  SELECT plan INTO v_plan FROM tenant_access WHERE user_id = p_user_id;

  v_limite := CASE v_plan
    WHEN 'basico' THEN 3
    WHEN 'demo'   THEN 999
    WHEN 'profesional' THEN 999
    WHEN 'premium' THEN 999
    ELSE 2
  END;

  SELECT count(*) INTO v_count
  FROM obras
  WHERE user_id = p_user_id AND status NOT IN ('finalizada', 'cobrada');

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'LIMITE_PLAN: Alcanzaste el límite de % obras activas del plan %', v_limite, COALESCE(v_plan, 'sin plan');
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO obras (id, user_id, nombre, direccion, m2, cliente_nombre, precio_inversor, fecha_inicio, fecha_fin_estimada)
  VALUES (v_id, p_user_id, p_nombre, p_direccion, p_m2, p_cliente_nombre, p_precio_inversor, p_fecha_inicio, p_fecha_fin_est);

  RETURN jsonb_build_object('id', v_id);
END;
$$;

-- 4. Bloquear UPDATE de perfiles.plan por el usuario
-- Reemplazar policy permissive "for all" por policies separadas
DROP POLICY IF EXISTS "perfil propio" ON perfiles;

CREATE POLICY "perfil_select" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfil_insert" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "perfil_update" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger que impide modificar la columna plan desde el cliente
CREATE OR REPLACE FUNCTION proteger_plan_perfiles()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.plan := OLD.plan;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_proteger_plan ON perfiles;
CREATE TRIGGER trig_proteger_plan
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION proteger_plan_perfiles();
