export interface VeiculoIA {
  marca: string | null;
  modelo: string | null;
  geracao: string | null;
  versao: string | null;
  ano: number | null;
  carroceria: string | null;
  fabricante_origem: string | null;
  confianca: "alta" | "media" | "baixa";
  caracteristicas: string[];
  raridade: "comum" | "incomum" | "raro" | "epico" | "lendario";
  justificativa: string;
  revisao: boolean;
}
const textoOpcional = { type: "string", nullable: true };
export const esquema = {
  type: "OBJECT",
  properties: {
    veiculo_detectado: { type: "BOOLEAN" },
    veiculos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          marca: textoOpcional,
          modelo: textoOpcional,
          geracao: textoOpcional,
          versao: textoOpcional,
          ano: { type: "INTEGER", nullable: true },
          carroceria: textoOpcional,
          fabricante_origem: textoOpcional,
          confianca: { type: "STRING", enum: ["alta", "media", "baixa"] },
          caracteristicas: { type: "ARRAY", items: { type: "STRING" } },
          raridade: {
            type: "STRING",
            enum: ["comum", "incomum", "raro", "epico", "lendario"],
          },
          justificativa: { type: "STRING" },
          revisao: { type: "BOOLEAN" },
        },
        required: [
          "marca",
          "modelo",
          "geracao",
          "versao",
          "ano",
          "carroceria",
          "fabricante_origem",
          "confianca",
          "caracteristicas",
          "raridade",
          "justificativa",
          "revisao",
        ],
      },
    },
  },
  required: ["veiculo_detectado", "veiculos"],
};
export function validarResultado(dados: unknown): VeiculoIA[] {
  if (!dados || typeof dados !== "object")
    throw new Error("Resposta inválida da IA.");
  const resultado = dados as Record<string, unknown>;
  if (
    typeof resultado.veiculo_detectado !== "boolean" ||
    !Array.isArray(resultado.veiculos) ||
    resultado.veiculos.length > 5
  )
    throw new Error("Resposta inválida da IA.");
  if (!resultado.veiculo_detectado || !resultado.veiculos.length)
    throw new Error(
      "Nenhum carro foi encontrado. Escolha uma fotografia mais clara.",
    );
  return resultado.veiculos.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new Error("Identificação inválida.");
    const carro = item as Record<string, unknown>;
    for (const campo of [
      "marca",
      "modelo",
      "geracao",
      "versao",
      "carroceria",
      "fabricante_origem",
    ]) {
      if (
        carro[campo] !== null &&
        (typeof carro[campo] !== "string" ||
          (carro[campo] as string).length > 80)
      )
        throw new Error("Campos inválidos na identificação.");
    }
    if (
      carro.ano !== null &&
      (!Number.isInteger(carro.ano) ||
        (carro.ano as number) < 1886 ||
        (carro.ano as number) > new Date().getFullYear() + 1)
    )
      throw new Error("Ano inválido na identificação.");
    if (
      !["alta", "media", "baixa"].includes(carro.confianca as string) ||
      !["comum", "incomum", "raro", "epico", "lendario"].includes(
        carro.raridade as string,
      ) ||
      typeof carro.revisao !== "boolean"
    )
      throw new Error("Classificação inválida da IA.");
    if (
      !Array.isArray(carro.caracteristicas) ||
      carro.caracteristicas.length > 20 ||
      carro.caracteristicas.some(
        (c) => typeof c !== "string" || c.length > 250,
      ) ||
      typeof carro.justificativa !== "string" ||
      carro.justificativa.length > 1500
    )
      throw new Error("Detalhes inválidos da IA.");
    const veiculo = carro as unknown as VeiculoIA;
    if (!veiculo.marca?.trim() || !veiculo.modelo?.trim())
      throw new Error(
        "Identificação inconclusiva. Tente uma foto com emblemas e carroceria visíveis.",
      );
    return {
      ...veiculo,
      marca: veiculo.marca.trim(),
      modelo: veiculo.modelo.trim(),
      revisao: veiculo.revisao || veiculo.confianca !== "alta",
    };
  });
}
