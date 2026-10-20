-- O cliente pode editar o perfil e interagir. Pontos e aprovações só mudam nas funções.
create or replace function public.normalizar(texto text) returns text
language sql immutable set search_path = public as $$
  select regexp_replace(lower(translate(trim(coalesce(texto, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')), '\s+', ' ', 'g');
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique check (usuario ~ '^[a-z0-9_.]{3,24}$'),
  nome text not null check (length(nome) between 2 and 60),
  bio text not null default '' check (length(bio) <= 250),
  avatar text, cidade text not null default '' check (length(cidade) <= 80),
  pontos integer not null default 0 check (pontos >= 0),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table public.user_roles (usuario_id uuid primary key references public.profiles(id) on delete cascade, administrador boolean not null default false);
create or replace function public.eh_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where usuario_id = auth.uid() and administrador);
$$;
create or replace function public.criar_perfil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, usuario, nome) values(new.id,
    lower(coalesce(nullif(new.raw_user_meta_data->>'usuario',''), 'spotter_' || substr(replace(new.id::text,'-',''),1,12))),
    coalesce(nullif(new.raw_user_meta_data->>'nome',''), 'Spotter'));
  return new;
end; $$;
create trigger novo_usuario after insert on auth.users for each row execute function public.criar_perfil();

create table public.rarity_tiers (codigo text primary key check(codigo in ('comum','incomum','raro','epico','lendario')), pontos integer not null check(pontos >= 0));
insert into public.rarity_tiers values ('comum',10),('incomum',30),('raro',80),('epico',200),('lendario',500);
create table public.car_brands (nome text primary key, criado_em timestamptz not null default now());
create table public.car_catalog (
  id uuid primary key default gen_random_uuid(), marca text not null references public.car_brands(nome),
  modelo text not null check(length(modelo) between 1 and 80), geracao text, versao text, ano integer check(ano between 1886 and 2100),
  raridade text not null references public.rarity_tiers(codigo), caracteristicas jsonb not null default '[]', justificativa text not null default '',
  verificado boolean not null default false,
  classificacao text not null default 'estimativa' check(classificacao in ('estimativa','verificada')),
  fonte text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  chave text generated always as (public.normalizar(marca)||'|'||public.normalizar(modelo)||'|'||public.normalizar(geracao)||'|'||public.normalizar(versao)) stored unique
);
create index catalogo_marca on public.car_catalog(marca);
create table public.vehicle_identifications (
  id uuid primary key default gen_random_uuid(), usuario_id uuid not null references public.profiles(id) on delete cascade,
  caminho text not null, hash text not null, indice integer not null default 0, resultado jsonb not null,
  carro_id uuid references public.car_catalog(id), revisao boolean not null default true,
  criado_em timestamptz not null default now(), unique(usuario_id, hash, indice)
);
create table public.analysis_requests (
  usuario_id uuid not null references public.profiles(id) on delete cascade, minuto timestamptz not null,
  quantidade integer not null default 1, primary key(usuario_id, minuto)
);
create table public.posts (
  id uuid primary key default gen_random_uuid(), autor_id uuid not null references public.profiles(id) on delete cascade,
  carro_id uuid not null references public.car_catalog(id), identificacao_id uuid not null references public.vehicle_identifications(id),
  caminho text not null, hash text not null unique,
  descricao text not null check(length(trim(descricao)) between 1 and 500), cidade text not null default '' check(length(cidade) <= 80),
  estado text not null check(estado in ('aprovado','pendente','rejeitado')) default 'pendente',
  pontos integer not null default 0 check(pontos >= 0), criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index posts_autor on public.posts(autor_id, criado_em desc);
create index posts_feed on public.posts(estado, criado_em desc);
create index posts_carro on public.posts(carro_id);
create table public.post_images (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, caminho text not null, hash text not null, hash_perceptual text, criado_em timestamptz not null default now());
create table public.post_likes (post_id uuid not null references public.posts(id) on delete cascade, usuario_id uuid not null references public.profiles(id) on delete cascade, criado_em timestamptz not null default now(), primary key(post_id,usuario_id));
create table public.post_comments (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, autor_id uuid not null references public.profiles(id) on delete cascade, texto text not null check(length(trim(texto)) between 1 and 500), criado_em timestamptz not null default now());
create index comentarios_post on public.post_comments(post_id,criado_em);
create table public.user_follows (seguidor uuid not null references public.profiles(id) on delete cascade, seguido uuid not null references public.profiles(id) on delete cascade, criado_em timestamptz not null default now(), primary key(seguidor,seguido), check(seguidor <> seguido));
create index seguidores_perfil on public.user_follows(seguido);
create table public.user_car_collection (usuario_id uuid not null references public.profiles(id) on delete cascade, carro_id uuid not null references public.car_catalog(id), post_id uuid not null references public.posts(id) on delete cascade, pontos integer not null, criado_em timestamptz not null default now(), primary key(usuario_id,carro_id));
-- O id da publicação não tem FK aqui para preservar a auditoria após exclusões.
create table public.point_transactions (id uuid primary key default gen_random_uuid(), usuario_id uuid not null references public.profiles(id) on delete cascade, post_id uuid not null, pontos integer not null, motivo text not null, criado_em timestamptz not null default now());
create index historico_usuario on public.point_transactions(usuario_id,criado_em);
create table public.achievements (codigo text primary key, nome text not null, descricao text not null);
insert into public.achievements values ('primeiro','Primeiro Spot','1 spot aprovado'),('raros','Caçador de Raros','5 carros raros'),('colecionador','Colecionador','20 modelos'),('lenda','Lenda das Ruas','1 lendário'),('porsche','Especialista Porsche','5 modelos Porsche'),('explorador','Explorador','50 spots aprovados');
create table public.user_achievements (usuario_id uuid not null references public.profiles(id) on delete cascade, conquista text not null references public.achievements(codigo), criado_em timestamptz not null default now(), primary key(usuario_id,conquista));
create table public.reports (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, autor_id uuid not null references public.profiles(id) on delete cascade, motivo text not null check(length(trim(motivo)) between 5 and 500), criado_em timestamptz not null default now(), unique(post_id,autor_id));
create table public.vehicle_validations (id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id) on delete set null, administrador_id uuid references public.profiles(id), aprovado boolean not null, criado_em timestamptz not null default now());
create table public.moderation_actions (id uuid primary key default gen_random_uuid(), administrador_id uuid references public.profiles(id), alvo text not null, acao text not null, criado_em timestamptz not null default now());

-- security_invoker faz as views respeitarem as políticas das tabelas de origem.
create view public.perfis_app with(security_invoker=true) as
  select id, usuario, nome, bio, avatar, cidade, pontos, criado_em as "criadoEm",
    exists(select 1 from public.user_roles r where r.usuario_id = p.id and r.administrador) as administrador
  from public.profiles p;
create view public.carros_app with(security_invoker=true) as
  select id, marca, modelo, geracao, versao, ano, raridade, caracteristicas, justificativa, verificado from public.car_catalog;
create view public.publicacoes_app with(security_invoker=true) as
  select p.id, p.autor_id as "autorId", to_jsonb(a) as autor, to_jsonb(c) as carro, p.caminho as foto,
    p.descricao, p.cidade, p.criado_em as "criadoEm", p.estado, p.pontos, p.hash,
    coalesce((select jsonb_agg(l.usuario_id) from public.post_likes l where l.post_id = p.id),'[]'::jsonb) as curtidas
  from public.posts p join public.perfis_app a on a.id=p.autor_id join public.carros_app c on c.id=p.carro_id;
create view public.comentarios_app with(security_invoker=true) as
  select c.id,c.post_id as "publicacaoId",c.autor_id as "autorId",p.usuario,c.texto,c.criado_em as "criadoEm" from public.post_comments c join public.profiles p on p.id=c.autor_id;

create or replace function public.recalcular_colecao(pessoa uuid) returns void
language plpgsql security definer set search_path=public as $$
declare registro record; valor integer; total integer := 0;
begin
  perform 1 from public.profiles where id=pessoa for update;
  delete from public.user_car_collection where usuario_id=pessoa;
  for registro in select p.*, r.pontos as valor_raridade, row_number() over(partition by p.carro_id order by p.criado_em,p.id) as ordem
    from public.posts p join public.car_catalog c on c.id=p.carro_id join public.rarity_tiers r on r.codigo=c.raridade
    where p.autor_id=pessoa and p.estado='aprovado' order by p.criado_em,p.id
  loop
    valor := case when registro.ordem=1 then registro.valor_raridade else 0 end;
    if valor <> registro.pontos then
      insert into public.point_transactions(usuario_id,post_id,pontos,motivo) values(pessoa,registro.id,valor-registro.pontos,'Atualização da coleção');
      update public.posts set pontos=valor where id=registro.id;
    end if;
    if registro.ordem=1 then insert into public.user_car_collection(usuario_id,carro_id,post_id,pontos,criado_em) values(pessoa,registro.carro_id,registro.id,valor,registro.criado_em); end if;
    total := total + valor;
  end loop;
  for registro in select * from public.posts where autor_id=pessoa and estado<>'aprovado' and pontos<>0 loop
    insert into public.point_transactions(usuario_id,post_id,pontos,motivo) values(pessoa,registro.id,-registro.pontos,'Registro invalidado');
    update public.posts set pontos=0 where id=registro.id;
  end loop;
  update public.profiles set pontos=total,atualizado_em=now() where id=pessoa;
  delete from public.user_achievements where usuario_id=pessoa;
  insert into public.user_achievements(usuario_id,conquista)
    select pessoa,codigo from public.achievements where
      (codigo='primeiro' and exists(select 1 from posts where autor_id=pessoa and estado='aprovado')) or
      (codigo='raros' and (select count(*) from user_car_collection u join car_catalog c on c.id=u.carro_id where u.usuario_id=pessoa and c.raridade='raro')>=5) or
      (codigo='colecionador' and (select count(*) from user_car_collection where usuario_id=pessoa)>=20) or
      (codigo='lenda' and exists(select 1 from user_car_collection u join car_catalog c on c.id=u.carro_id where u.usuario_id=pessoa and c.raridade='lendario')) or
      (codigo='porsche' and (select count(*) from user_car_collection u join car_catalog c on c.id=u.carro_id where u.usuario_id=pessoa and normalizar(c.marca)='porsche')>=5) or
      (codigo='explorador' and (select count(*) from posts where autor_id=pessoa and estado='aprovado')>=50);
end; $$;

create or replace function public.publicar_spot(spot_id uuid, identificacao_id uuid, marca_corrigida text, modelo_corrigido text, versao_corrigida text, legenda text, cidade_spot text) returns uuid
language plpgsql security definer set search_path=public as $$
declare pessoa uuid:=auth.uid(); analise public.vehicle_identifications; carro public.car_catalog; corrigido boolean; estado_spot text; existente public.posts;
begin
  if pessoa is null then raise exception 'Autenticação obrigatória'; end if;
  perform 1 from public.profiles where id=pessoa for update;
  select * into existente from public.posts where id=spot_id;
  if found then if existente.autor_id<>pessoa then raise exception 'ID de publicação já utilizado'; end if; return existente.id; end if;
  select * into analise from public.vehicle_identifications where id=identificacao_id and usuario_id=pessoa;
  if not found then raise exception 'Identificação inválida ou de outro usuário'; end if;
  if length(trim(marca_corrigida)) not between 1 and 60 or length(trim(modelo_corrigido)) not between 1 and 80 or length(coalesce(versao_corrigida,''))>80 then raise exception 'Confira marca, modelo e versão'; end if;
  corrigido := normalizar(marca_corrigida)<>normalizar(analise.resultado->>'marca') or normalizar(modelo_corrigido)<>normalizar(analise.resultado->>'modelo') or normalizar(versao_corrigida)<>normalizar(analise.resultado->>'versao');
  select * into carro from public.car_catalog where chave=normalizar(marca_corrigida)||'|'||normalizar(modelo_corrigido)||'|'||normalizar(analise.resultado->>'geracao')||'|'||normalizar(versao_corrigida);
  if not found then
    insert into public.car_brands(nome) values(trim(marca_corrigida)) on conflict do nothing;
    insert into public.car_catalog(marca,modelo,versao,geracao,ano,raridade,caracteristicas,justificativa,verificado)
      values(trim(marca_corrigida),trim(modelo_corrigido),nullif(trim(versao_corrigida),''),analise.resultado->>'geracao',nullif(analise.resultado->>'ano','')::integer,
        coalesce(analise.resultado->>'raridade','comum'),coalesce(analise.resultado->'caracteristicas','[]'),coalesce(analise.resultado->>'justificativa','Cadastro provisório'),false)
      on conflict(chave) do update set atualizado_em=now() returning * into carro;
  end if;
  estado_spot := case when corrigido or analise.revisao or not carro.verificado or carro.raridade in ('epico','lendario') then 'pendente' else 'aprovado' end;
  insert into public.posts(id,autor_id,carro_id,identificacao_id,caminho,hash,descricao,cidade,estado) values(spot_id,pessoa,carro.id,analise.id,analise.caminho,analise.hash,legenda,coalesce(cidade_spot,''),estado_spot);
  insert into public.post_images(post_id,caminho,hash) values(spot_id,analise.caminho,analise.hash);
  perform public.recalcular_colecao(pessoa); return spot_id;
end; $$;

create or replace function public.excluir_spot_pontos() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform 1 from public.profiles where id=old.autor_id for update;
  if old.pontos<>0 then insert into public.point_transactions(usuario_id,post_id,pontos,motivo) values(old.autor_id,old.id,-old.pontos,'Exclusão da publicação'); end if;
  perform public.recalcular_colecao(old.autor_id); return old;
end; $$;
create trigger exclusao_pontos after delete on public.posts for each row execute function public.excluir_spot_pontos();

create or replace function public.alternar_curtida(spot_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória'; end if;
  if not exists(select 1 from public.posts where id=spot_id and (estado='aprovado' or autor_id=auth.uid() or public.eh_admin())) then raise exception 'Spot indisponível'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  delete from public.post_likes where post_id=spot_id and usuario_id=auth.uid();
  if not found then insert into public.post_likes(post_id,usuario_id) values(spot_id,auth.uid()); end if;
end; $$;
create or replace function public.alternar_seguir(perfil_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or auth.uid()=perfil_id then raise exception 'Perfil inválido'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  delete from public.user_follows where seguidor=auth.uid() and seguido=perfil_id;
  if not found then insert into public.user_follows(seguidor,seguido) values(auth.uid(),perfil_id); end if;
end; $$;

create or replace function public.reservar_analise(pessoa uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare total integer;
begin
  perform 1 from public.profiles where id=pessoa for update;
  if (select coalesce(sum(quantidade),0) from public.analysis_requests where usuario_id=pessoa and minuto>=date_trunc('day',now()))>=50 then return false; end if;
  insert into public.analysis_requests(usuario_id,minuto) values(pessoa,date_trunc('minute',now())) on conflict(usuario_id,minuto) do update set quantidade=analysis_requests.quantidade+1 returning quantidade into total;
  return total<=5;
end; $$;

create or replace function public.moderar_spot(spot_id uuid, aprovado boolean, marca_corrigida text default null, modelo_corrigido text default null, versao_corrigida text default null) returns void
language plpgsql security definer set search_path=public as $$
declare registro public.posts; carro public.car_catalog; novo_id uuid;
begin
  if not public.eh_admin() then raise exception 'Sem permissão administrativa'; end if;
  select * into registro from public.posts where id=spot_id;
  if not found then raise exception 'Spot não encontrado'; end if;
  perform 1 from public.profiles where id=registro.autor_id for update;
  select * into carro from public.car_catalog where id=registro.carro_id;
  if marca_corrigida is not null and modelo_corrigido is not null then
    if length(trim(marca_corrigida)) not between 1 and 60 or length(trim(modelo_corrigido)) not between 1 and 80 then raise exception 'Marca e modelo obrigatórios'; end if;
    insert into public.car_brands(nome) values(trim(marca_corrigida)) on conflict do nothing;
    insert into public.car_catalog(marca,modelo,geracao,versao,ano,raridade,caracteristicas,justificativa,verificado)
      values(trim(marca_corrigida),trim(modelo_corrigido),carro.geracao,nullif(trim(versao_corrigida),''),carro.ano,carro.raridade,carro.caracteristicas,carro.justificativa,aprovado)
      on conflict(chave) do update set verificado=car_catalog.verificado or aprovado returning id into novo_id;
    update public.posts set carro_id=novo_id where id=spot_id;
  end if;
  update public.posts set estado=case when aprovado then 'aprovado' else 'rejeitado' end,atualizado_em=now() where id=spot_id;
  insert into public.vehicle_validations(post_id,administrador_id,aprovado) values(spot_id,auth.uid(),aprovado);
  insert into public.moderation_actions(administrador_id,alvo,acao) values(auth.uid(),spot_id::text,case when aprovado then 'aprovar' else 'invalidar' end);
  perform public.recalcular_colecao(registro.autor_id);
end; $$;
create or replace function public.editar_raridade(carro_id uuid,nova_raridade text) returns void language plpgsql security definer set search_path=public as $$
declare pessoa record;
begin
  if not public.eh_admin() then raise exception 'Sem permissão administrativa'; end if;
  update public.car_catalog set raridade=nova_raridade,verificado=true,atualizado_em=now() where id=carro_id;
  if not found then raise exception 'Carro não encontrado'; end if;
  insert into public.moderation_actions(administrador_id,alvo,acao) values(auth.uid(),carro_id::text,'Raridade: '||nova_raridade);
  for pessoa in select distinct autor_id from public.posts where posts.carro_id=editar_raridade.carro_id order by autor_id loop perform public.recalcular_colecao(pessoa.autor_id); end loop;
end; $$;
create or replace function public.ranking(periodo text default 'geral', cidade_filtro text default null) returns setof public.perfis_app language sql stable security definer set search_path=public as $$
  select p.id,p.usuario,p.nome,p.bio,p.avatar,p.cidade,
    case when periodo='geral' then p.pontos else coalesce((select sum(c.pontos)::integer from public.user_car_collection c where c.usuario_id=p.id and c.criado_em>=now() - case when periodo='semanal' then interval '7 days' else interval '30 days' end),0) end as pontos,
    p.criado_em,false from public.profiles p where auth.uid() is not null and (cidade_filtro is null or p.cidade ilike '%'||cidade_filtro||'%') and not exists(select 1 from public.user_roles r where r.usuario_id=p.id and r.administrador) order by pontos desc,p.usuario limit 100;
$$;
create or replace function public.painel_moderacao() returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão administrativa'; end if;
  return jsonb_build_object('pendentes',coalesce((select jsonb_agg(p) from public.publicacoes_app p where estado='pendente'),'[]'),
    'denuncias',coalesce((select jsonb_agg(jsonb_build_object('id',id,'publicacaoId',post_id,'autorId',autor_id,'motivo',motivo,'criadoEm',criado_em)) from public.reports),'[]'),
    'movimentos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'publicacaoId',post_id,'usuarioId',usuario_id,'pontos',pontos,'motivo',motivo,'criadoEm',criado_em)) from public.point_transactions),'[]'),
    'catalogo',coalesce((select jsonb_agg(c) from public.carros_app c),'[]'));
end; $$;

-- Todas as tabelas têm RLS; as que não têm política de escrita são somente do servidor.
do $$ declare tabela text; begin
  foreach tabela in array array['profiles','user_roles','rarity_tiers','car_brands','car_catalog','vehicle_identifications','analysis_requests','posts','post_images','post_likes','post_comments','user_follows','user_car_collection','point_transactions','achievements','user_achievements','reports','vehicle_validations','moderation_actions'] loop
    execute format('alter table public.%I enable row level security',tabela);
  end loop;
end; $$;
create policy perfis_leitura on public.profiles for select to authenticated using(true);
create policy perfis_edicao on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy papeis_leitura on public.user_roles for select to authenticated using(true);
create policy raridades_leitura on public.rarity_tiers for select to authenticated using(true);
create policy marcas_leitura on public.car_brands for select to authenticated using(true);
create policy catalogo_leitura on public.car_catalog for select to authenticated using(true);
create policy identificacao_leitura on public.vehicle_identifications for select to authenticated using(usuario_id=auth.uid() or public.eh_admin());
create policy spots_leitura on public.posts for select to authenticated using(estado='aprovado' or autor_id=auth.uid() or public.eh_admin());
create policy spots_exclusao on public.posts for delete to authenticated using(autor_id=auth.uid());
create policy imagens_leitura on public.post_images for select to authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy curtidas_leitura on public.post_likes for select to authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy comentarios_leitura on public.post_comments for select to authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy comentarios_criacao on public.post_comments for insert to authenticated with check(autor_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy comentarios_exclusao on public.post_comments for delete to authenticated using(autor_id=auth.uid());
create policy seguidores_leitura on public.user_follows for select to authenticated using(true);
create policy colecao_leitura on public.user_car_collection for select to authenticated using(true);
create policy movimentos_leitura on public.point_transactions for select to authenticated using(usuario_id=auth.uid() or public.eh_admin());
create policy conquistas_leitura on public.achievements for select to authenticated using(true);
create policy conquistas_usuario_leitura on public.user_achievements for select to authenticated using(true);
create policy denuncias_leitura on public.reports for select to authenticated using(autor_id=auth.uid() or public.eh_admin());
create policy denuncias_criacao on public.reports for insert to authenticated with check(autor_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
create policy validacoes_leitura on public.vehicle_validations for select to authenticated using(public.eh_admin());
create policy moderacao_leitura on public.moderation_actions for select to authenticated using(public.eh_admin());

revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.user_roles,public.rarity_tiers,public.car_brands,public.car_catalog,public.vehicle_identifications,public.posts,public.post_images,public.post_likes,public.post_comments,public.user_follows,public.user_car_collection,public.point_transactions,public.achievements,public.user_achievements,public.reports,public.vehicle_validations,public.moderation_actions,public.perfis_app,public.carros_app,public.publicacoes_app,public.comentarios_app to authenticated;
grant update(nome,usuario,bio,avatar,cidade) on public.profiles to authenticated;
grant insert on public.post_comments,public.reports to authenticated;
grant delete on public.posts,public.post_comments to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.normalizar(text),public.eh_admin(),public.publicar_spot(uuid,uuid,text,text,text,text,text),public.alternar_curtida(uuid),public.alternar_seguir(uuid),public.moderar_spot(uuid,boolean,text,text,text),public.editar_raridade(uuid,text),public.ranking(text,text),public.painel_moderacao() to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('spots','spots',false,6291456,array['image/jpeg']),('avatares','avatares',true,6291456,array['image/jpeg']) on conflict(id) do nothing;
create policy fotos_envio on storage.objects for insert to authenticated with check(bucket_id in ('spots','avatares') and (storage.foldername(name))[1]=auth.uid()::text);
create policy fotos_leitura on storage.objects for select to authenticated using((bucket_id='spots' and ((storage.foldername(name))[1]=auth.uid()::text or public.eh_admin() or exists(select 1 from public.posts p where p.caminho=name and p.estado='aprovado'))) or bucket_id='avatares');
create policy avatar_edicao on storage.objects for update to authenticated using(bucket_id='avatares' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatares' and (storage.foldername(name))[1]=auth.uid()::text);
create policy fotos_exclusao on storage.objects for delete to authenticated using(bucket_id in ('spots','avatares') and (storage.foldername(name))[1]=auth.uid()::text);
