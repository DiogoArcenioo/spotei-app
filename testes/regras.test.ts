import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularNivel,
  chaveCarro,
  obterGaragem,
  pontosRaridade,
} from "../src/utils/pontuacao.ts";
import { recalcularPontos } from "../src/utils/regrasDemo.ts";
import { validarResultado } from "../supabase/functions/identify-vehicle/validacao.ts";
import type { DadosDemo, Perfil, Publicacao } from "../src/types/spot.ts";
const perfil: Perfil = {
  id: "teste",
  nome: "Teste",
  usuario: "teste",
  pontos: 0,
  bio: "",
  cidade: "",
  avatar: null,
  criadoEm: "2026-01-01",
  administrador: false,
};
const carro = {
  id: "bmw",
  marca: "BMW",
  modelo: "M3",
  versao: "Competition",
  geracao: "G80",
  ano: 2022,
  raridade: "raro" as const,
  caracteristicas: [],
  justificativa: "",
  verificado: true,
};
function publicacao(
  id: string,
  estado: "aprovado" | "pendente" = "aprovado",
): Publicacao {
  return {
    id,
    autorId: perfil.id,
    autor: { ...perfil },
    carro: { ...carro },
    foto: "foto",
    descricao: "Um spot",
    hash: id,
    criadoEm: `2026-01-0${id}`,
    pontos: 0,
    curtidas: [],
    cidade: "",
    estado,
  };
}
function banco(publicacoes: Publicacao[]): DadosDemo {
  return {
    perfis: [{ ...perfil }],
    publicacoes,
    contas: [],
    comentarios: [],
    seguindo: [],
    denuncias: [],
    movimentos: [],
    catalogo: [carro],
  };
}
test("Pontuação não duplica por modelo e versão; exclusão transfere ao próximo registro", () => {
  const dados = banco([
    publicacao("1"),
    publicacao("2"),
    publicacao("3", "pendente"),
  ]);
  recalcularPontos(dados);
  assert.equal(dados.perfis[0].pontos, 80);
  assert.deepEqual(
    dados.publicacoes.map((p) => p.pontos),
    [80, 0, 0],
  );
  assert.equal(obterGaragem(dados.publicacoes, perfil.id).length, 1);
  dados.publicacoes.shift();
  recalcularPontos(dados);
  assert.equal(dados.perfis[0].pontos, 80);
  assert.equal(dados.publicacoes[0].pontos, 80);
});
test("Aprovação, rejeição e mudança de raridade recalculam o saldo", () => {
  const dados = banco([publicacao("1", "pendente")]);
  recalcularPontos(dados);
  assert.equal(dados.perfis[0].pontos, 0);
  dados.publicacoes[0].estado = "aprovado";
  recalcularPontos(dados);
  assert.equal(dados.perfis[0].pontos, 80);
  dados.publicacoes[0].carro.raridade = "epico";
  recalcularPontos(dados);
  assert.equal(dados.perfis[0].pontos, 200);
  dados.publicacoes[0].estado = "rejeitado";
  recalcularPontos(dados);
  assert.equal(dados.perfis[0].pontos, 0);
});
test("Normalização, tabela de raridade e limites de nível", () => {
  assert.equal(
    chaveCarro({ marca: " PORSCHE ", modelo: " 911 ", versao: "GT3  RS" }),
    chaveCarro({ marca: "porsche", modelo: "911", versao: "gt3 rs" }),
  );
  assert.deepEqual(Object.values(pontosRaridade), [10, 30, 80, 200, 500]);
  assert.equal(calcularNivel(299).nivel, 1);
  assert.equal(calcularNivel(300).nivel, 2);
  assert.equal(calcularNivel(-10).progresso, 0);
});
test("Validação da IA rejeita respostas inválidas e mantém versão desconhecida", () => {
  const veiculo = {
    marca: "Porsche",
    modelo: "911",
    versao: null,
    geracao: null,
    ano: null,
    carroceria: null,
    fabricante_origem: null,
    confianca: "media",
    caracteristicas: ["Cupê"],
    raridade: "raro",
    justificativa: "Inconclusivo",
    revisao: false,
  };
  const resultado = validarResultado({
    veiculo_detectado: true,
    veiculos: [veiculo],
  });
  assert.equal(resultado[0].versao, null);
  assert.equal(resultado[0].revisao, true);
  assert.throws(
    () => validarResultado({ veiculo_detectado: false, veiculos: [] }),
    /Nenhum carro/,
  );
  assert.throws(
    () =>
      validarResultado({
        veiculo_detectado: true,
        veiculos: [{ ...veiculo, raridade: "super-raro" }],
      }),
    /Classificação/,
  );
  assert.throws(
    () =>
      validarResultado({
        veiculo_detectado: true,
        veiculos: [{ ...veiculo, ano: 3000 }],
      }),
    /Ano/,
  );
});
