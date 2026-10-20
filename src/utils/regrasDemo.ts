import type { DadosDemo } from "../types/spot";
import { chaveCarro, pontosRaridade } from "./pontuacao.ts";
// Simulação local das regras que, em produção, são executadas no PostgreSQL.
export function recalcularPontos(dados: DadosDemo) {
  for (const perfil of dados.perfis) {
    let total = 0;
    const vistos = new Set<string>();
    const publicacoes = dados.publicacoes
      .filter((p) => p.autorId === perfil.id)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    for (const publicacao of publicacoes) {
      const chave = chaveCarro(publicacao.carro);
      const valor =
        publicacao.estado === "aprovado" && !vistos.has(chave)
          ? pontosRaridade[publicacao.carro.raridade]
          : 0;
      if (publicacao.estado === "aprovado") vistos.add(chave);
      if (publicacao.pontos !== valor) {
        dados.movimentos.push({
          id: `${publicacao.id}:${dados.movimentos.length}`,
          usuarioId: perfil.id,
          publicacaoId: publicacao.id,
          pontos: valor - publicacao.pontos,
          motivo: "Revisão da coleção",
          criadoEm: new Date().toISOString(),
        });
      }
      publicacao.pontos = valor;
      total += valor;
    }
    perfil.pontos = total;
  }
  for (const publicacao of dados.publicacoes)
    publicacao.autor = dados.perfis.find((p) => p.id === publicacao.autorId)!;
}
