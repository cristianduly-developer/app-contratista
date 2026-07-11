-- ================================================================
-- RPC: regenerar token del link público de un gremio
-- ================================================================

create or replace function regenerar_token_gremio(p_gremio_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_new_token text;
begin
  if not exists (select 1 from gremios where id = p_gremio_id and user_id = auth.uid()) then
    raise exception 'NO_ACCESO';
  end if;

  v_new_token := encode(gen_random_bytes(16), 'hex');

  update gremios set token_link = v_new_token where id = p_gremio_id;

  return v_new_token;
end;
$$;
