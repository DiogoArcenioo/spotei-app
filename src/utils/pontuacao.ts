import type { Publicacao, Raridade } from "../types/spot";

export const pontosRaridade: Record<Raridade, number> = {
  comum: 10,
  incomum: 30,
  raro: 80,
  epico: 200,
  lendario: 500,
};
export const nomesRaridade: Record<Raridade, string> = {
  comum: "Comum",
  incomum: "Incomum",
  raro: "Raro",
  epico: "Épico",
  lendario: "Lendário",
};
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
export function chaveCarro(carro: {
  marca: string;
  modelo: string;
  versao: string | null;
  geracao?: string | null;
}) {
  return [carro.marca, carro.modelo, carro.geracao ?? "", carro.versao ?? ""]
    .map(normalizar)
    .join("|");
}
// Cada nível exige mais 300 pontos; a barra mostra o progresso dentro do nível.
export function calcularNivel(pontos: number) {
  const nivel = Math.floor(Math.max(0, pontos) / 300) + 1;
  return {
    nivel,
    progresso: (Math.max(0, pontos) % 300) / 300,
    proximaMeta: nivel * 300,
  };
}
export function obterGaragem(publicacoes: Publicacao[], usuarioId: string) {
  const carros = new Map<string, Publicacao>();
  for (const publicacao of [...publicacoes].sort((a, b) =>
    a.criadoEm.localeCompare(b.criadoEm),
  )) {
    if (
      publicacao.autorId === usuarioId &&
      publicacao.estado === "aprovado" &&
      !carros.has(chaveCarro(publicacao.carro))
    ) {
      carros.set(chaveCarro(publicacao.carro), publicacao);
    }
  }
  return [...carros.values()];
}
export function obterConquistas(publicacoes: Publicacao[], usuarioId: string) {
  const garagem = obterGaragem(publicacoes, usuarioId);
  const aprovados = publicacoes.filter(
    (p) => p.autorId === usuarioId && p.estado === "aprovado",
  );
  return [
    {
      nome: "Primeiro Spot",
      descricao: "1 spot aprovado",
      obtida: aprovados.length >= 1,
    },
    {
      nome: "Caçador de Raros",
      descricao: "5 carros raros diferentes",
      obtida: garagem.filter((p) => p.carro.raridade === "raro").length >= 5,
    },
    {
      nome: "Colecionador",
      descricao: "20 modelos diferentes",
      obtida: garagem.length >= 20,
    },
    {
      nome: "Lenda das Ruas",
      descricao: "1 lendário aprovado",
      obtida: garagem.some((p) => p.carro.raridade === "lendario"),
    },
    {
      nome: "Especialista Porsche",
      descricao: "5 modelos Porsche",
      obtida:
        garagem.filter((p) => normalizar(p.carro.marca) === "porsche").length >=
        5,
    },
    {
      nome: "Explorador",
      descricao: "50 spots aprovados",
      obtida: aprovados.length >= 50,
    },
  ];
}
