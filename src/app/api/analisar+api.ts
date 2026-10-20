import { ErroIA, reconhecerCarros } from "../../server/gemini.ts";
import type { Identificacao } from "../../types/spot.ts";
import {
  decodificarImagem,
  limiteImagem,
  tipoImagem,
} from "../../../supabase/functions/identify-vehicle/imagem.ts";

// Esta rota atende o desenvolvimento local. A produção usa a função autenticada do Supabase.
function habilitada() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.EXPO_PUBLIC_APP_MODE === "demo" &&
    process.env.EXPO_PUBLIC_IA_MODE === "gemini"
  );
}
let dia = "";
let chamadas: number[] = [];
const cache = new Map<string, Identificacao>();
const emAndamento = new Map<string, Promise<Identificacao>>();

async function identificar(
  bytes: Uint8Array,
  hash: string,
): Promise<Identificacao> {
  const carros = await reconhecerCarros(
    bytes,
    process.env.GEMINI_API_KEY ?? "",
    process.env.GEMINI_MODEL ?? "",
    fetch,
    process.env.GEMINI_FALLBACK_MODEL ?? "",
  );
  const candidatos = carros.map((carro): Identificacao => {
    const id = crypto.randomUUID();
    return {
      ...carro,
      marca: carro.marca!,
      modelo: carro.modelo!,
      id,
      identificacaoId: id,
      caminho: "",
      hash,
      verificado: false,
      revisao: true,
      simulada: false,
    };
  });
  const resultado = { ...candidatos[0], candidatos };
  cache.set(hash, resultado);
  return resultado;
}

export function GET() {
  return Response.json({
    analiseReal: habilitada() && !!process.env.GEMINI_API_KEY,
    modelo: habilitada() ? process.env.GEMINI_MODEL : undefined,
  });
}

export async function POST(pedido: Request) {
  if (!habilitada())
    return Response.json(
      {
        erro: "Rota disponível somente no desenvolvimento local com IA Gemini.",
      },
      { status: 404 },
    );
  const origem = pedido.headers.get("Origin");
  if (origem && origem !== new URL(pedido.url).origin)
    return Response.json({ erro: "Origem não permitida." }, { status: 403 });
  try {
    const tipo = pedido.headers
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    const json = tipo === "application/json";
    if (
      !json &&
      !tipo?.startsWith("image/") &&
      tipo !== "application/octet-stream"
    )
      throw new ErroIA(415, "Envie uma fotografia.");
    const limite = json ? Math.ceil(limiteImagem / 3) * 4 + 1024 : limiteImagem;
    if (Number(pedido.headers.get("Content-Length")) > limite)
      throw new ErroIA(413, "Escolha uma foto de até 6 MB.");
    const leitor = pedido.body?.getReader();
    if (!leitor) throw new ErroIA(400, "Escolha uma fotografia.");
    const partes: Uint8Array[] = [];
    let tamanho = 0;
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.length;
      if (tamanho > limite) {
        await leitor.cancel();
        throw new ErroIA(413, "Escolha uma foto de até 6 MB.");
      }
      partes.push(value);
    }
    let bytes = new Uint8Array(tamanho);
    let posicao = 0;
    for (const parte of partes) {
      bytes.set(parte, posicao);
      posicao += parte.length;
    }
    if (json) {
      try {
        bytes = decodificarImagem(
          JSON.parse(new TextDecoder().decode(bytes)).imagem,
        );
      } catch (erro) {
        throw new ErroIA(
          400,
          erro instanceof Error ? erro.message : "Arquivo inválido.",
        );
      }
    }
    if (bytes.length > limiteImagem)
      throw new ErroIA(413, "Escolha uma foto de até 6 MB.");
    if (!tipoImagem(bytes))
      throw new ErroIA(
        400,
        "Arquivo inválido. Selecione a imagem original novamente.",
      );
    const hoje = new Date().toISOString().slice(0, 10);
    if (dia !== hoje) {
      dia = hoje;
      chamadas = [];
      cache.clear();
    }
    const resumo = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const hash = Array.from(resumo, (valor) =>
      valor.toString(16).padStart(2, "0"),
    ).join("");
    const anterior = cache.get(hash);
    if (anterior) return Response.json(anterior);
    const aguardando = emAndamento.get(hash);
    if (aguardando) return Response.json(await aguardando);
    const agora = Date.now();
    if (
      chamadas.length >= 50 ||
      chamadas.filter((hora) => hora > agora - 60000).length >= 5
    )
      throw new ErroIA(
        429,
        "Limite local de análises atingido: 5 por minuto e 50 por dia. Tente mais tarde.",
      );
    chamadas.push(agora);
    const tarefa = identificar(bytes, hash);
    emAndamento.set(hash, tarefa);
    try {
      return Response.json(await tarefa, {
        headers: { "Cache-Control": "no-store" },
      });
    } finally {
      emAndamento.delete(hash);
    }
  } catch (erro) {
    const codigo = erro instanceof ErroIA ? erro.codigo : 500;
    return Response.json(
      {
        erro:
          erro instanceof ErroIA
            ? erro.message
            : "Não foi possível analisar a fotografia. Seu rascunho continua salvo.",
      },
      { status: codigo },
    );
  }
}
