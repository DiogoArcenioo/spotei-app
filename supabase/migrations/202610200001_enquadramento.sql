alter table public.posts add column enquadramento text not null default 'inteira'
  check (enquadramento in ('inteira','preencher'));

create or replace view public.publicacoes_app with(security_invoker=true) as
  select p.id, p.autor_id as "autorId", to_jsonb(a) as autor, to_jsonb(c) as carro, p.caminho as foto,
    p.descricao, p.cidade, p.criado_em as "criadoEm", p.estado, p.pontos, p.hash,
    coalesce((select jsonb_agg(l.usuario_id) from public.post_likes l where l.post_id=p.id),'[]'::jsonb) as curtidas,
    p.enquadramento
  from public.posts p join public.perfis_app a on a.id=p.autor_id join public.carros_app c on c.id=p.carro_id;

-- A publicação e o enquadramento são salvos na mesma transação.
-- A função original continua verificando autoria, identificação, duplicidade e pontos.
create or replace function public.publicar_spot_enquadrado(
  spot_id uuid, identificacao_id uuid, marca_corrigida text, modelo_corrigido text,
  versao_corrigida text, legenda text, cidade_spot text, enquadramento_foto text default 'inteira'
) returns uuid language plpgsql security definer set search_path=public as $$
declare registro uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória'; end if;
  if enquadramento_foto is null or enquadramento_foto not in ('inteira','preencher') then
    raise exception 'Enquadramento inválido';
  end if;
  registro := public.publicar_spot(spot_id,identificacao_id,marca_corrigida,modelo_corrigido,versao_corrigida,legenda,cidade_spot);
  update public.posts set enquadramento=enquadramento_foto where id=registro and autor_id=auth.uid();
  return registro;
end; $$;

revoke all on function public.publicar_spot_enquadrado(uuid,uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.publicar_spot_enquadrado(uuid,uuid,text,text,text,text,text,text) to authenticated;
