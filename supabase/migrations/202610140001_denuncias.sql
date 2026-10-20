-- O histórico permanece no banco; apenas denúncias abertas aparecem no painel.
alter table public.reports add column resolvida boolean not null default false;

create or replace function public.resolver_denuncia(denuncia_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão administrativa'; end if;
  update public.reports set resolvida=true where id=denuncia_id;
  if not found then raise exception 'Denúncia não encontrada'; end if;
  insert into public.moderation_actions(administrador_id,alvo,acao)
    values(auth.uid(),denuncia_id::text,'arquivar denúncia');
end; $$;
revoke all on function public.resolver_denuncia(uuid) from public,anon;
grant execute on function public.resolver_denuncia(uuid) to authenticated;

create or replace function public.painel_moderacao() returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão administrativa'; end if;
  return jsonb_build_object('pendentes',coalesce((select jsonb_agg(p) from public.publicacoes_app p where estado='pendente'),'[]'),
    'denuncias',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'publicacaoId',d.post_id,'autorId',d.autor_id,'motivo',d.motivo,'criadoEm',d.criado_em,'estadoPublicacao',p.estado)) from public.reports d join public.posts p on p.id=d.post_id where not d.resolvida),'[]'),
    'movimentos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'publicacaoId',post_id,'usuarioId',usuario_id,'pontos',pontos,'motivo',motivo,'criadoEm',criado_em)) from public.point_transactions),'[]'),
    'catalogo',coalesce((select jsonb_agg(c) from public.carros_app c),'[]'));
end; $$;
