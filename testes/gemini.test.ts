import test from "node:test";
import assert from "node:assert/strict";
import { ErroIA, reconhecerCarros } from "../src/server/gemini.ts";
import { POST } from "../src/app/api/analisar+api.ts";
import {
  decodificarImagem,
  tipoImagem,
} from "../supabase/functions/identify-vehicle/imagem.ts";

const foto = new Uint8Array([255, 216, 255, 0, 1]);
const carro = {
  marca: "BMW",
  modelo: "M5",
  geracao: null,
  versao: null,
  ano: null,
  carroceria: "sedã",
  fabricante_origem: null,
  confianca: "alta",
  caracteristicas: ["Emblema M5"],
  raridade: "raro",
  justificativa: "Estimativa visual",
  revisao: false,
};
function respostaIA(resultado: unknown) {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(resultado) }] } }],
  });
}

test("Gemini recebe a fotografia de verdade e mantém campos desconhecidos", async () => {
  let enviado = false;
  const consultar: typeof fetch = async (url, opcoes) => {
    assert.match(String(url), /models\/modelo-teste:generateContent$/);
    assert.equal(
      (opcoes?.headers as Record<string, string>)["x-goog-api-key"],
      "chave-teste",
    );
    const corpo = JSON.parse(String(opcoes?.body));
    assert.equal(
      corpo.contents[0].parts[1].inlineData.data,
      Buffer.from(foto).toString("base64"),
    );
    enviado = true;
    return respostaIA({ veiculo_detectado: true, veiculos: [carro] });
  };
  const resultado = await reconhecerCarros(
    foto,
    "chave-teste",
    "modelo-teste",
    consultar,
  );
  assert.equal(enviado, true);
  assert.equal(resultado[0].modelo, "M5");
  assert.equal(resultado[0].versao, null);
  assert.equal(resultado[0].ano, null);
});

test("Repete uma falha temporária sem trocar a análise por simulação", async () => {
  let tentativas = 0;
  const resultado = await reconhecerCarros(foto, "teste", "teste", async () => {
    tentativas++;
    return tentativas === 1
      ? new Response(null, { status: 503 })
      : respostaIA({ veiculo_detectado: true, veiculos: [carro] });
  });
  assert.equal(tentativas, 2);
  assert.equal(resultado[0].modelo, "M5");
});

test("Modelo ocupado ou removido usa a reserva e mantém a mesma fotografia", async () => {
  for (const status of [503, 404]) {
    const modelos: string[] = [];
    await reconhecerCarros(
      foto,
      "teste",
      "principal",
      async (url, opcoes) => {
        const modelo = String(url).match(/models\/([^:]+):/)![1];
        modelos.push(modelo);
        const imagem = JSON.parse(String(opcoes?.body)).contents[0].parts[1]
          .inlineData.data;
        assert.equal(imagem, Buffer.from(foto).toString("base64"));
        return modelo === "principal"
          ? Response.json({ error: { status: "UNAVAILABLE" } }, { status })
          : respostaIA({ veiculo_detectado: true, veiculos: [carro] });
      },
      "reserva",
    );
    assert.deepEqual(modelos, ["principal", "reserva"]);
  }
});

test("Falhas de cota, chave e entrada não repetem nem usam outro modelo", async () => {
  for (const status of [400, 401, 403, 429]) {
    let chamadas = 0;
    await assert.rejects(
      reconhecerCarros(
        foto,
        "chave-secreta",
        "principal",
        async () => {
          chamadas++;
          return Response.json(
            { error: { message: "chave-secreta" } },
            { status },
          );
        },
        "reserva",
      ),
      (erro: unknown) =>
        erro instanceof ErroIA && !erro.message.includes("chave-secreta"),
    );
    assert.equal(chamadas, 1);
  }
});

test("Falha persistente encerra em três tentativas e preserva erro legível", async () => {
  let chamadas = 0;
  await assert.rejects(
    reconhecerCarros(
      foto,
      "teste",
      "principal",
      async () => {
        chamadas++;
        return new Response(null, { status: 503 });
      },
      "reserva",
    ),
    /temporariamente ocupados/,
  );
  assert.equal(chamadas, 3);
});

test("Ausência de carro, resposta quebrada e cota viram erros legíveis", async () => {
  await assert.rejects(
    reconhecerCarros(foto, "teste", "teste", async () =>
      respostaIA({ veiculo_detectado: false, veiculos: [] }),
    ),
    /Nenhum carro/,
  );
  await assert.rejects(
    reconhecerCarros(foto, "teste", "teste", async () =>
      Response.json({ candidates: [] }),
    ),
    /identificação válida/,
  );
  await assert.rejects(
    reconhecerCarros(foto, "teste", "teste", async () =>
      Response.json({ error: "chave-privada" }, { status: 429 }),
    ),
    (erro: unknown) =>
      erro instanceof ErroIA &&
      erro.codigo === 429 &&
      !erro.message.includes("chave-privada"),
  );
});

test("Chave ausente, arquivo inválido e arquivo grande não chamam o Google", async () => {
  const naoChamar: typeof fetch = async () => {
    assert.fail("Não deveria enviar o arquivo");
  };
  await assert.rejects(
    reconhecerCarros(foto, "", "teste", naoChamar),
    /Configure/,
  );
  await assert.rejects(
    reconhecerCarros(new Uint8Array([0]), "teste", "teste", naoChamar),
    /Arquivo inválido/,
  );
  await assert.rejects(
    reconhecerCarros(
      new Uint8Array(6 * 1024 * 1024 + 1),
      "teste",
      "teste",
      naoChamar,
    ),
    /até 6 MB/,
  );
});

test("PNG, WebP e fotos HEIC/HEIF usam o MIME do conteúdo, independente da extensão", async () => {
  const criarHeif = (marca: string) => {
    const arquivo = Buffer.alloc(24);
    arquivo.writeUInt32BE(24);
    arquivo.write(`ftyp${marca}`, 4, "ascii");
    arquivo.write("mif1", 16, "ascii");
    return new Uint8Array(arquivo);
  };
  const imagens = [
    [
      "image/png",
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
        "base64",
      ),
    ],
    [
      "image/webp",
      Buffer.from(
        "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
        "base64",
      ),
    ],
    ["image/heic", criarHeif("heic")],
    ["image/heif", criarHeif("mif1")],
  ] as const;
  for (const [tipo, imagem] of imagens) {
    await reconhecerCarros(imagem, "teste", "teste", async (_url, opcoes) => {
      const parte = JSON.parse(String(opcoes?.body)).contents[0].parts[1]
        .inlineData;
      assert.equal(parte.mimeType, tipo);
      assert.deepEqual(Buffer.from(parte.data, "base64"), Buffer.from(imagem));
      return respostaIA({ veiculo_detectado: true, veiculos: [carro] });
    });
  }
  assert.equal(tipoImagem(criarHeif("avif")), null);
  assert.equal(
    tipoImagem(new Uint8Array([0, 0, 0, 8, 102, 116, 121, 112])),
    null,
  );
});

test("Envio base64 preserva todos os bytes e rejeita conteúdo ausente, quebrado e excessivo", () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  const base64 = Buffer.from(bytes).toString("base64");
  assert.deepEqual(decodificarImagem(base64), bytes);
  assert.deepEqual(
    decodificarImagem(`data:image/jpeg;base64,${base64}`),
    bytes,
  );
  for (const invalido of [undefined, {}, "", "@nao-e-imagem", "AAAA===", "AA"])
    assert.throws(() => decodificarImagem(invalido));
  assert.throws(
    () => decodificarImagem("A".repeat(8 * 1024 * 1024 + 4)),
    /até 6 MB/,
  );
});

test("A rota bloqueia produção e origem externa; reutiliza análise sem expor a chave", async () => {
  const ambiente = { ...process.env };
  const consultar = globalThis.fetch;
  try {
    process.env.NODE_ENV = "production";
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/analisar", { method: "POST" }),
        )
      ).status,
      404,
    );
    process.env.NODE_ENV = "development";
    process.env.EXPO_PUBLIC_APP_MODE = "demo";
    process.env.EXPO_PUBLIC_IA_MODE = "gemini";
    process.env.GEMINI_API_KEY = "chave-privada-teste";
    process.env.GEMINI_MODEL = "modelo-teste";
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/analisar", {
            method: "POST",
            headers: { Origin: "https://fora.example" },
          }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/analisar", {
            method: "POST",
            body: "texto",
          }),
        )
      ).status,
      415,
    );
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/analisar", {
            method: "POST",
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Length": String(6 * 1024 * 1024 + 1),
            },
            body: foto,
          }),
        )
      ).status,
      413,
    );
    let chamadas = 0;
    globalThis.fetch = async () => {
      chamadas++;
      return respostaIA({ veiculo_detectado: true, veiculos: [carro] });
    };
    const criarPedido = () =>
      new Request("http://localhost/api/analisar", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: foto,
      });
    const primeira = await POST(criarPedido());
    assert.equal(primeira.status, 200);
    const texto = await primeira.text();
    assert.equal(texto.includes(process.env.GEMINI_API_KEY), false);
    const dados = JSON.parse(texto);
    assert.equal(dados.simulada, false);
    assert.equal(dados.revisao, true);
    assert.equal(dados.hash.length, 64);
    assert.equal(dados.candidatos[0].modelo, "M5");
    assert.equal((await POST(criarPedido())).status, 200);
    assert.equal(chamadas, 1);
    const outra = new Uint8Array([255, 216, 255, 11, 12]);
    const simultanea = () =>
      POST(
        new Request("http://localhost/api/analisar", {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: outra,
        }),
      );
    globalThis.fetch = async () => {
      chamadas++;
      await new Promise((resolver) => setTimeout(resolver, 25));
      return respostaIA({ veiculo_detectado: true, veiculos: [carro] });
    };
    const respostas = await Promise.all([simultanea(), simultanea()]);
    assert.equal(
      chamadas,
      2,
      "Pedidos simultâneos usam a mesma análise em andamento.",
    );
    assert.deepEqual(await respostas[0].json(), await respostas[1].json());
    // Uma falha não pode ficar no cache e impedir uma nova tentativa.
    const falhou = new Uint8Array([255, 216, 255, 21, 22]);
    const refazer = () =>
      POST(
        new Request("http://localhost/api/analisar", {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: falhou,
        }),
      );
    globalThis.fetch = async () => new Response(null, { status: 400 });
    assert.equal((await refazer()).status, 503);
    globalThis.fetch = async () =>
      respostaIA({ veiculo_detectado: true, veiculos: [carro] });
    assert.equal((await refazer()).status, 200);
    const envioCelular = await POST(
      new Request("http://localhost/api/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagem: Buffer.from(foto).toString("base64") }),
      }),
    );
    assert.equal(envioCelular.status, 200);
    assert.equal((await envioCelular.json()).hash, dados.hash);
    assert.equal(
      chamadas,
      2,
      "JSON e binário representam a mesma foto, sem análise duplicada.",
    );
    for (const corpo of [
      '{"imagem":"invalida!"}',
      '{"imagem":null}',
      "{json quebrado",
    ]) {
      const invalida = await POST(
        new Request("http://localhost/api/analisar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: corpo,
        }),
      );
      assert.equal(invalida.status, 400);
    }
    assert.equal(chamadas, 2);
  } finally {
    globalThis.fetch = consultar;
    process.env = ambiente;
  }
});
