import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Migração e regras de produção executadas em PostgreSQL (PGlite)", async (t) => {
  const banco = new PGlite();
  const pessoa = "11111111-1111-4111-8111-111111111111";
  const outro = "22222222-2222-4222-8222-222222222222";
  const admin = "33333333-3333-4333-8333-333333333333";
  try {
    // Apenas Auth/Storage do Supabase são substituídos; toda a migração é executada.
    await banco.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;`);
    await banco.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610070001_spotei.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await banco.exec(
      await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    await banco.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610140001_denuncias.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await banco.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610200001_enquadramento.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await banco.query(
      `insert into auth.users(id,raw_user_meta_data) values($1,'{"nome":"Teste","usuario":"teste"}'),($2,'{"nome":"Outro","usuario":"outro"}'),($3,'{"nome":"Admin","usuario":"admin"}')`,
      [pessoa, outro, admin],
    );
    await banco.query(
      `insert into user_roles(usuario_id,administrador) values($1,true)`,
      [admin],
    );
    const carro = (
      await banco.query<{ id: string }>(
        `select id from car_catalog where marca='BMW'`,
      )
    ).rows[0].id;
    const resultado = {
      marca: "BMW",
      modelo: "M3",
      geracao: "G80",
      versao: "Competition",
      ano: 2022,
      raridade: "raro",
    };
    const identificacao = (
      await banco.query<{ id: string }>(
        `insert into vehicle_identifications(usuario_id,caminho,hash,resultado,carro_id,revisao) values($1,'foto-1','hash-1',$2,$3,false) returning id`,
        [pessoa, JSON.stringify(resultado), carro],
      )
    ).rows[0].id;
    async function como(id: string) {
      await banco.exec("reset role");
      await banco.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
        id,
      ]);
      await banco.exec("set role authenticated");
    }
    async function pontos() {
      await banco.exec("reset role");
      return (
        await banco.query<{ pontos: number }>(
          "select pontos from profiles where id=$1",
          [pessoa],
        )
      ).rows[0].pontos;
    }
    await t.test("RLS habilitado em todas as tabelas", async () => {
      const { rows } = await banco.query<{ total: number }>(
        `select count(*)::int total from pg_tables where schemaname='public' and not rowsecurity`,
      );
      assert.equal(rows[0].total, 0);
    });
    await t.test(
      "Usuário não pode editar saldo nem se tornar administrador",
      async () => {
        await como(pessoa);
        await assert.rejects(
          banco.query("update profiles set pontos=99999 where id=$1", [pessoa]),
          /permission denied/,
        );
        await assert.rejects(
          banco.query("insert into user_roles values($1,true)", [pessoa]),
          /permission denied/,
        );
      },
    );
    const idSpot = "44444444-4444-4444-8444-444444444444";
    await t.test(
      "Publicação concede pontos no servidor e é idempotente",
      async () => {
        await como(pessoa);
        const consulta =
          "select publicar_spot_enquadrado($1,$2,$3,$4,$5,$6,$7,$8)";
        const valores = [
          idSpot,
          identificacao,
          "BMW",
          "M3",
          "Competition",
          "Meu carro",
          "Criciúma",
          "inteira",
        ];
        await banco.query(consulta, valores);
        await banco.query(consulta, valores);
        assert.equal(await pontos(), 80);
      },
    );
    await t.test(
      "Enquadramento é persistido na publicação e não altera pontos nem autoria",
      async () => {
        const salvar =
          "select publicar_spot_enquadrado($1,$2,'BMW','M3','Competition','Meu carro','Criciúma',$3)";
        for (const modo of ["preencher", "inteira"]) {
          await como(pessoa);
          await banco.query(salvar, [idSpot, identificacao, modo]);
          const leitura = await banco.query<{ enquadramento: string }>(
            "select enquadramento from publicacoes_app where id=$1",
            [idSpot],
          );
          assert.equal(leitura.rows[0].enquadramento, modo);
          assert.equal(await pontos(), 80);
        }
        await como(outro);
        await assert.rejects(
          banco.query(salvar, [idSpot, identificacao, "preencher"]),
          /já utilizado/,
        );
        await como(pessoa);
        await assert.rejects(
          banco.query(salvar, [idSpot, identificacao, "invalido"]),
          /Enquadramento inválido/,
        );
        const leitura = await banco.query<{ enquadramento: string }>(
          "select enquadramento from publicacoes_app where id=$1",
          [idSpot],
        );
        assert.equal(leitura.rows[0].enquadramento, "inteira");
      },
    );
    await t.test(
      "Arquivo duplicado não pode gerar outra publicação",
      async () => {
        await como(pessoa);
        await assert.rejects(
          banco.query(
            `select publicar_spot('55555555-5555-4555-8555-555555555555',$1,'BMW','M3','Competition','Outra foto','')`,
            [identificacao],
          ),
          /unique constraint/,
        );
      },
    );
    await t.test(
      "Foto adicional não duplica pontos e exclusão transfere a coleção",
      async () => {
        await banco.exec("reset role");
        const segunda = (
          await banco.query<{ id: string }>(
            `insert into vehicle_identifications(usuario_id,caminho,hash,resultado,carro_id,revisao) values($1,'foto-2','hash-2',$2,$3,false) returning id`,
            [pessoa, JSON.stringify(resultado), carro],
          )
        ).rows[0].id;
        await como(pessoa);
        await banco.query(
          `select publicar_spot('66666666-6666-4666-8666-666666666666',$1,'BMW','M3','Competition','Outro M3','')`,
          [segunda],
        );
        assert.equal(await pontos(), 80);
        await como(outro);
        await banco.query("delete from posts where id=$1", [idSpot]);
        await banco.exec("reset role");
        assert.equal(
          (await banco.query("select id from posts where id=$1", [idSpot])).rows
            .length,
          1,
        );
        await como(pessoa);
        await banco.query("delete from posts where id=$1", [idSpot]);
        assert.equal(await pontos(), 80);
      },
    );
    await t.test("Curtida e seguir alternam sem mudar saldo", async () => {
      await como(pessoa);
      await banco.query(
        `select alternar_curtida('66666666-6666-4666-8666-666666666666')`,
      );
      await banco.query(
        `select alternar_curtida('66666666-6666-4666-8666-666666666666')`,
      );
      await banco.query("select alternar_seguir($1)", [outro]);
      await banco.query("select alternar_seguir($1)", [outro]);
      assert.equal(await pontos(), 80);
    });
    await t.test(
      "Moderação é protegida, invalida pontos e permite correção",
      async () => {
        await como(pessoa);
        await assert.rejects(
          banco.query(
            `select moderar_spot('66666666-6666-4666-8666-666666666666',false)`,
          ),
          /Sem permissão/,
        );
        await como(admin);
        await banco.query(
          `select moderar_spot('66666666-6666-4666-8666-666666666666',false)`,
        );
        assert.equal(await pontos(), 0);
        await como(admin);
        await banco.query(
          `select moderar_spot('66666666-6666-4666-8666-666666666666',true,'BMW','M3','Competition')`,
        );
        assert.equal(await pontos(), 80);
      },
    );
    await t.test(
      "Raridade configurada no catálogo recalcula pontos e histórico",
      async () => {
        await como(admin);
        await banco.query("select editar_raridade($1,$2)", [carro, "epico"]);
        assert.equal(await pontos(), 200);
        await como(admin);
        const { rows } = await banco.query<{
          painel_moderacao: { catalogo: unknown[]; movimentos: unknown[] };
        }>("select painel_moderacao()");
        assert.ok(rows[0].painel_moderacao.catalogo.length >= 6);
        assert.ok(rows[0].painel_moderacao.movimentos.length >= 4);
      },
    );
    await t.test(
      "Ranking, conquistas e limite de análises funcionam no banco",
      async () => {
        await como(pessoa);
        const { rows } = await banco.query<{ pontos: number }>(
          `select * from ranking('geral',null)`,
        );
        assert.equal(rows[0].pontos, 200);
        await banco.exec("reset role");
        assert.equal(
          (
            await banco.query(
              `select * from user_achievements where usuario_id=$1 and conquista='primeiro'`,
              [pessoa],
            )
          ).rows.length,
          1,
        );
        for (let indice = 0; indice < 5; indice++)
          assert.equal(
            (
              await banco.query<{ reservar_analise: boolean }>(
                "select reservar_analise($1)",
                [pessoa],
              )
            ).rows[0].reservar_analise,
            true,
          );
        assert.equal(
          (
            await banco.query<{ reservar_analise: boolean }>(
              "select reservar_analise($1)",
              [pessoa],
            )
          ).rows[0].reservar_analise,
          false,
        );
        await como(pessoa);
        await assert.rejects(
          banco.query("select reservar_analise($1)", [pessoa]),
          /permission denied/,
        );
      },
    );
    await t.test(
      "Somente a moderação pode arquivar denúncias e o histórico permanece",
      async () => {
        await como(outro);
        const denuncia = (
          await banco.query<{ id: string }>(
            "insert into reports(post_id,autor_id,motivo) values('66666666-6666-4666-8666-666666666666',$1,'Teste de denuncia') returning id",
            [outro],
          )
        ).rows[0].id;
        await assert.rejects(
          banco.query("select resolver_denuncia($1)", [denuncia]),
          /Sem permissão/,
        );
        await como(admin);
        const antes = (
          await banco.query<{
            painel_moderacao: { denuncias: { id: string }[] };
          }>("select painel_moderacao()")
        ).rows[0].painel_moderacao;
        assert.ok(antes.denuncias.some((d) => d.id === denuncia));
        await banco.query("select resolver_denuncia($1)", [denuncia]);
        const depois = (
          await banco.query<{
            painel_moderacao: { denuncias: { id: string }[] };
          }>("select painel_moderacao()")
        ).rows[0].painel_moderacao;
        assert.equal(
          depois.denuncias.some((d) => d.id === denuncia),
          false,
        );
        assert.equal(
          (
            await banco.query<{ resolvida: boolean }>(
              "select resolvida from reports where id=$1",
              [denuncia],
            )
          ).rows[0].resolvida,
          true,
        );
      },
    );
  } finally {
    await banco.close();
  }
});
