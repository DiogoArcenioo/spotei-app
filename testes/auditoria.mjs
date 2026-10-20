import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const endereco = process.env.SPOTEI_TEST_URL ?? "http://localhost:8081";
await mkdir("qa", { recursive: true });
const navegador = await chromium.launch();
let numero = 0;
const falhas = [];
async function verificar(nome, executar) {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on("pageerror", (erro) => erros.push(erro.message));
  try {
    await executar(pagina);
    assert.deepEqual(erros, []);
    console.log(`OK: ${nome}`);
  } catch (erro) {
    await pagina.screenshot({ path: `qa/auditoria-falha-${numero}.png` });
    console.log((await pagina.locator("body").innerText()).slice(-3500));
    falhas.push({ nome, erro });
    console.log(`FALHOU: ${nome}: ${erro.message.slice(0, 450)}`);
  } finally {
    numero++;
    await contexto.close();
  }
}
async function entrar(pagina, admin = false) {
  await pagina.goto(endereco, { waitUntil: "domcontentloaded" });
  await pagina
    .getByRole("button", {
      name: admin
        ? "Moderação demonstrativa"
        : /Entrar (no app|na demonstração)/,
      exact: true,
    })
    .click();
  await expect(pagina.getByText("Na mira da comunidade")).toBeVisible();
}
async function perfil(pagina) {
  await pagina.goto(`${endereco}/perfil`, { waitUntil: "domcontentloaded" });
  await expect(
    pagina.getByRole("button", { name: "Opções do perfil", exact: true }),
  ).toBeVisible();
}
async function sair(pagina) {
  await perfil(pagina);
  await pagina
    .getByRole("button", { name: "Opções do perfil", exact: true })
    .click();
  await pagina
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(
    pagina.getByRole("button", {
      name: /Entrar (no app|na demonstração)/,
      exact: true,
    }),
  ).toBeVisible();
}
async function fotoControlada(pagina, caminho = "assets/carros/bmw.jpg") {
  // O roteiro audita controles sem consumir a cota da IA. test:ia faz chamadas reais.
  await pagina.route("**/api/analisar", async (rota) => {
    const hash = createHash("sha256")
      .update(rota.request().postDataBuffer())
      .digest("hex");
    const principal = {
      id: `audit-${hash}`,
      identificacaoId: `audit-${hash}`,
      marca: "Audi",
      modelo: "RS6",
      geracao: null,
      versao: null,
      ano: null,
      raridade: "raro",
      caracteristicas: ["Cenário controlado de interface"],
      justificativa: "Teste de controles",
      verificado: false,
      confianca: "alta",
      revisao: true,
      simulada: false,
      hash,
      caminho: "",
    };
    await rota.fulfill({
      json: {
        ...principal,
        candidatos: [
          principal,
          {
            ...principal,
            id: "audit-bmw",
            identificacaoId: "audit-bmw",
            marca: "BMW",
            modelo: "M5",
          },
        ],
      },
    });
  });
  await pagina.getByRole("button", { name: "Novo spot", exact: true }).click();
  const [arquivo] = await Promise.all([
    pagina.waitForEvent("filechooser"),
    pagina.getByRole("button", { name: "Galeria", exact: true }).click(),
  ]);
  await arquivo.setFiles(caminho);
  await expect(
    pagina.getByText("Analisando seu spot", { exact: true }),
  ).toBeVisible();
  await expect(
    pagina.getByRole("heading", { name: "Audi RS6", exact: true }),
  ).toBeVisible();
  await expect(
    pagina.getByRole("button", { name: "Salvar e publicar", exact: true }),
  ).toBeVisible();
}

try {
  await verificar(
    "cadastro, validação, edição, foto, privacidade e login persistente",
    async (p) => {
      await p.goto(endereco, { waitUntil: "domcontentloaded" });
      await expect(
        p.getByRole("button", { name: "Recuperar", exact: true }),
      ).toHaveCount(0);
      await p.getByRole("button", { name: "Criar conta", exact: true }).click();
      await p
        .getByRole("button", { name: "Criar minha conta", exact: true })
        .click();
      await expect(
        p.getByText("Confira os campos destacados.", { exact: true }),
      ).toBeVisible();
      await p.getByLabel("Nome", { exact: true }).fill("Teste Auditoria");
      await p.getByLabel("Usuário", { exact: true }).fill("teste.auditoria");
      await p
        .getByLabel("E-mail", { exact: true })
        .fill("auditoria@example.test");
      await p.getByLabel("Senha", { exact: true }).fill("senha-teste-123");
      await p.getByRole("switch").click();
      await p
        .getByRole("button", { name: "Criar minha conta", exact: true })
        .click();
      await expect(p.getByText("Na mira da comunidade")).toBeVisible();
      await perfil(p);
      await p
        .getByRole("button", { name: "Criar primeiro spot", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Galeria", exact: true }),
      ).toBeVisible();
      await perfil(p);
      await p
        .getByRole("button", { name: "Editar perfil", exact: true })
        .click();
      await p.getByLabel("Nome", { exact: true }).fill("");
      await p
        .getByRole("button", { name: "Salvar perfil", exact: true })
        .click();
      await expect(
        p.getByText("Confira seu nome e usuário.", { exact: true }),
      ).toBeVisible();
      await p.getByLabel("Nome", { exact: true }).fill("Perfil Editado");
      await p.getByLabel("Usuário", { exact: true }).fill("audit.editado");
      await p
        .getByLabel("Biografia", { exact: true })
        .fill("Perfil revisado na auditoria.");
      await p.getByLabel("Cidade", { exact: true }).fill("Criciúma, SC");
      const [arquivo] = await Promise.all([
        p.waitForEvent("filechooser"),
        p.getByRole("button", { name: "Trocar foto", exact: true }).click(),
      ]);
      await arquivo.setFiles("assets/carros/bmw.jpg");
      await p
        .getByRole("button", { name: "Salvar perfil", exact: true })
        .click();
      await expect(
        p.getByText("@audit.editado", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Ver seguidores do perfil", exact: true })
        .click();
      await expect(
        p.getByText("Nenhum perfil por aqui ainda.", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Fechar lista", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Ver conquistas", exact: true })
        .click();
      await expect(
        p.getByText("Suas conquistas", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Ver spots do perfil", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Criar primeiro spot", exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Opções do perfil", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Privacidade e conta", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Editar meus dados", exact: true })
        .click();
      await expect(p.getByLabel("Usuário", { exact: true })).toHaveValue(
        "audit.editado",
      );
      await sair(p);
      await p
        .getByLabel("E-mail", { exact: true })
        .fill("auditoria@example.test");
      await p.getByLabel("Senha", { exact: true }).fill("senha-teste-123");
      await p
        .getByRole("button", { name: "Entrar", exact: true })
        .last()
        .click();
      await expect(p.getByText("Na mira da comunidade")).toBeVisible();
      await p.reload();
      await expect(p.getByText("Na mira da comunidade")).toBeVisible();
      await p.goto(`${endereco}/redefinir-senha`, {
        waitUntil: "domcontentloaded",
      });
      await p
        .getByRole("button", { name: "Voltar ao app", exact: true })
        .click();
      await expect(p.getByText("Na mira da comunidade")).toBeVisible();
    },
  );

  await verificar(
    "curtidas, atalho de comentar, excluir comentário, detalhes e menu",
    async (p) => {
      await entrar(p);
      await p
        .getByRole("button", { name: "Sincronizar publicações", exact: true })
        .click();
      await expect(
        p.getByText("Dados atualizados", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Descurtir spot", exact: true })
        .first()
        .click();
      await p
        .getByRole("button", { name: "Curtir spot", exact: true })
        .first()
        .click();
      await p
        .getByRole("button", { name: "Comentar spot", exact: true })
        .first()
        .click();
      await expect(
        p
          .getByLabel("Seu comentário", { exact: true })
          .filter({ visible: true }),
      ).toBeFocused();
      await p
        .getByLabel("Seu comentário", { exact: true })
        .fill("Comentário auditado.");
      await p.getByRole("button", { name: "Comentar", exact: true }).click();
      await expect(
        p.getByText("Comentário auditado.", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Excluir meu comentário", exact: true })
        .click();
      await expect(
        p.getByText("Comentário auditado.", { exact: true }),
      ).toHaveCount(0);
      await p
        .getByRole("button", { name: "Ver detalhes do carro", exact: true })
        .click();
      await expect(
        p.getByText("O que se destaca", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", {
          name: "Abrir spot Porsche Panamera",
          exact: true,
        })
        .click();
      await p
        .getByRole("button", { name: "Opções e detalhes do spot", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Fechar opções", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Comentar spot", exact: true })
        .click();
      await expect(
        p
          .getByLabel("Seu comentário", { exact: true })
          .filter({ visible: true }),
      ).toBeFocused();
    },
  );

  await verificar(
    "seguir, deixar de seguir, listas, busca, filtros e ranking",
    async (p) => {
      await entrar(p);
      await p.getByRole("button", { name: "Explorar", exact: true }).click();
      await p.getByLabel("Buscar", { exact: true }).fill("ana.motor");
      await p.getByText("@ana.motor", { exact: true }).click();
      await p
        .getByRole("button", { name: "Deixar de seguir", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Seguir spotter", exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Seguir spotter", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Ver seguidores do perfil", exact: true })
        .click();
      await p
        .getByRole("button", {
          name: "Ver perfil de voce.spotter",
          exact: true,
        })
        .click();
      await expect(
        p.getByRole("button", { name: "Editar perfil", exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Ver seguindo do perfil", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Ver perfil de ana.motor", exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Fechar lista", exact: true })
        .click();
      await p.goto(`${endereco}/feed`, { waitUntil: "domcontentloaded" });
      await p.getByRole("button", { name: "Last Spot", exact: true }).click();
      await p.getByRole("button", { name: "Global Spot", exact: true }).click();
      await p.getByRole("button", { name: "Explorar", exact: true }).click();
      await p.getByLabel("Buscar", { exact: true }).fill("Porsche");
      await p.getByRole("button", { name: "Lendário", exact: true }).click();
      await expect(
        p.getByText("Nenhum spot corresponde à sua busca.", { exact: true }),
      ).toBeVisible();
      await p.getByRole("button", { name: "Épico", exact: true }).click();
      await expect(
        p.getByRole("button", {
          name: "Abrir spot Porsche Panamera",
          exact: true,
        }),
      ).toBeVisible();
      await p.getByRole("tab", { name: /Ranking/ }).click();
      await p.getByRole("button", { name: "Semana", exact: true }).click();
      await p.getByRole("button", { name: "Mês", exact: true }).click();
      await p.getByRole("button", { name: "Geral", exact: true }).click();
      await p
        .getByLabel("Cidade ou região", { exact: true })
        .fill("Cidade inexistente");
      await expect(
        p.getByText("Nenhum spotter nessa região.", { exact: true }),
      ).toBeVisible();
      await p.getByLabel("Cidade ou região", { exact: true }).fill("Criciúma");
      await p
        .getByRole("button", {
          name: "Ver perfil de voce.spotter",
          exact: true,
        })
        .click();
      await expect(
        p.getByRole("button", { name: "Editar perfil", exact: true }),
      ).toBeVisible();
    },
  );

  await verificar(
    "garagem, filtros, exclusão com cancelar e confirmar",
    async (p) => {
      await entrar(p);
      await perfil(p);
      await p
        .getByRole("button", { name: "Minha garagem", exact: true })
        .click();
      await p
        .getByLabel("Filtrar por marca", { exact: true })
        .fill("sem-marca");
      await expect(
        p.getByText("Nenhum carro aprovado corresponde aos filtros.", {
          exact: true,
        }),
      ).toBeVisible();
      await p.getByLabel("Filtrar por marca", { exact: true }).fill("Ford");
      await p.getByRole("button", { name: "Mais pontos", exact: true }).click();
      await p
        .getByRole("button", { name: "Mais recentes", exact: true })
        .click();
      await p.getByRole("button", { name: "Incomum", exact: true }).click();
      await p
        .getByRole("button", { name: "Abrir spot Ford Explorer", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Opções e detalhes do spot", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Excluir publicação", exact: true })
        .click();
      await expect(
        p.getByText("Excluir este spot?", { exact: true }),
      ).toBeVisible();
      await p.getByRole("button", { name: "Cancelar", exact: true }).click();
      await p
        .getByRole("button", { name: "Excluir spot", exact: true })
        .click();
      await p.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect(
        p.getByRole("button", {
          name: "Abrir spot Ford Explorer",
          exact: true,
        }),
      ).toHaveCount(0);
    },
  );

  await verificar(
    "denúncia, invalidação, acesso ao rejeitado, arquivo e catálogo",
    async (p) => {
      await entrar(p);
      await p
        .getByRole("button", { name: "Opções e detalhes do spot", exact: true })
        .first()
        .click();
      await p
        .getByRole("button", { name: "Denunciar publicação", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Enviar denúncia", exact: true })
        .click();
      await expect(
        p.getByText("Descreva o motivo com pelo menos 5 caracteres.", {
          exact: true,
        }),
      ).toBeVisible();
      await p
        .getByLabel("Motivo da denúncia", { exact: true })
        .fill("Identificação incorreta para teste de revisão.");
      await p
        .getByRole("button", { name: "Enviar denúncia", exact: true })
        .click();
      await expect(
        p.getByText("Denúncia recebida. A moderação vai revisar este spot.", {
          exact: true,
        }),
      ).toBeVisible();
      await sair(p);
      await p
        .getByRole("button", { name: "Moderação demonstrativa", exact: true })
        .click();
      await perfil(p);
      await p
        .getByRole("button", { name: "Opções do perfil", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Abrir moderação", exact: true })
        .click();
      await p.getByRole("button", { name: "Denúncias", exact: true }).click();
      await p
        .getByRole("button", { name: "Ver publicação", exact: true })
        .click();
      await expect(
        p.getByText("Porsche Panamera", { exact: true }).first(),
      ).toBeVisible();
      await p.goBack();
      await p
        .getByRole("button", { name: "Invalidar registro", exact: true })
        .click();
      await p.getByRole("button", { name: "Cancelar", exact: true }).click();
      await p
        .getByRole("button", { name: "Invalidar registro", exact: true })
        .click();
      await p.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect(
        p.getByRole("button", { name: "Registro invalidado", exact: true }),
      ).toBeDisabled();
      await p
        .getByRole("button", { name: "Ver publicação", exact: true })
        .click();
      await expect(
        p.getByText(
          "Registro rejeitado pela moderação. Nenhum ponto foi concedido.",
          { exact: true },
        ),
      ).toBeVisible();
      await p.goBack();
      await p
        .getByRole("button", { name: "Arquivar denúncia", exact: true })
        .click();
      await expect(
        p.getByText("Nenhuma denúncia recebida.", { exact: true }),
      ).toBeVisible();
      await p.getByRole("button", { name: "Catálogo", exact: true }).click();
      const cartao = p
        .getByText("Porsche Panamera Turbo", { exact: true })
        .locator("..");
      await expect(
        cartao.getByRole("button", { name: "Salvar raridade", exact: true }),
      ).toBeDisabled();
      await cartao.getByRole("button", { name: "Raro", exact: true }).click();
      await cartao
        .getByRole("button", { name: "Salvar raridade", exact: true })
        .click();
      await expect(
        cartao.getByText("Raridade salva.", { exact: true }),
      ).toBeVisible();
      await p.getByRole("button", { name: "Pontos", exact: true }).click();
      await expect(
        p.getByText("Revisão da coleção", { exact: true }).first(),
      ).toBeVisible();
    },
  );

  await verificar(
    "candidatos da IA, detalhes, correção, rascunho, rejeição e novos modelos no catálogo",
    async (p) => {
      await entrar(p);
      await fotoControlada(p);
      await p
        .getByRole("button", { name: "Corrigir identificação", exact: true })
        .click();
      await p.getByRole("button", { name: "BMW M5", exact: true }).click();
      await expect(
        p.getByRole("heading", { name: "BMW M5", exact: true }),
      ).toBeVisible();
      await p.getByRole("button", { name: "Audi RS6", exact: true }).click();
      await expect(
        p.getByText("Cenário controlado de interface", { exact: true }),
      ).toBeVisible();
      await p.getByLabel("Modelo", { exact: true }).fill("");
      await p
        .getByRole("button", { name: "Corrigir identificação", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Salvar e publicar", exact: true })
        .click();
      await expect(
        p.getByText("Informe o modelo.", { exact: true }),
      ).toBeVisible();
      await p.getByLabel("Modelo", { exact: true }).fill("RS6");
      await p
        .getByLabel("Legenda", { exact: true })
        .fill("Registro de auditoria.");
      await p.reload();
      await expect(p.getByLabel("Legenda", { exact: true })).toHaveValue(
        "Registro de auditoria.",
      );
      await p.getByRole("switch").click();
      await p
        .getByRole("button", { name: "Salvar e publicar", exact: true })
        .click();
      await expect(p).toHaveURL(/\/perfil$/);
      await expect(
        p.getByText("Em revisão · 0 pontos", { exact: true }),
      ).toBeVisible();
      await sair(p);
      await p
        .getByRole("button", { name: "Moderação demonstrativa", exact: true })
        .click();
      await perfil(p);
      await p
        .getByRole("button", { name: "Opções do perfil", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Abrir moderação", exact: true })
        .click();
      await p.getByRole("button", { name: "Catálogo", exact: true }).click();
      await expect(p.getByText("Audi RS6", { exact: true })).toBeVisible();
      await p.getByRole("button", { name: "Pendentes", exact: true }).click();
      await p.getByRole("button", { name: "Rejeitar", exact: true }).click();
      await expect(
        p.getByText("Nenhum registro pendente.", { exact: true }),
      ).toBeVisible();
      await sair(p);
      await p
        .getByRole("button", {
          name: /Entrar (no app|na demonstração)/,
          exact: true,
        })
        .click();
      await perfil(p);
      await expect(
        p.getByText("Rejeitado · 0 pontos", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Abrir spot Audi RS6", exact: true })
        .click();
      await expect(
        p.getByText(
          "Registro rejeitado pela moderação. Nenhum ponto foi concedido.",
          { exact: true },
        ),
      ).toBeVisible();
      await p.goto(`${endereco}/feed`, { waitUntil: "domcontentloaded" });
      await fotoControlada(p, "assets/carros/porsche.jpg");
      await p
        .getByLabel("Legenda", { exact: true })
        .fill("Registro para aprovação.");
      await p.getByRole("switch").click();
      await p
        .getByRole("button", { name: "Salvar e publicar", exact: true })
        .click();
      await expect(p).toHaveURL(/\/perfil$/);
      await sair(p);
      await p
        .getByRole("button", { name: "Moderação demonstrativa", exact: true })
        .click();
      await perfil(p);
      await p
        .getByRole("button", { name: "Opções do perfil", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Abrir moderação", exact: true })
        .click();
      await p.getByLabel("Marca", { exact: true }).fill("");
      await p.getByRole("button", { name: "Aprovar", exact: true }).click();
      await expect(
        p.getByText("Informe a marca e o modelo antes de aprovar.", {
          exact: true,
        }),
      ).toBeVisible();
      await p.getByLabel("Marca", { exact: true }).fill("Audi");
      await p.getByRole("button", { name: "Aprovar", exact: true }).click();
      await expect(
        p.getByText("Nenhum registro pendente.", { exact: true }),
      ).toBeVisible();
      await sair(p);
      await p
        .getByRole("button", {
          name: /Entrar (no app|na demonstração)/,
          exact: true,
        })
        .click();
      await perfil(p);
      await expect(p.getByText("120 pts", { exact: true })).toBeVisible();
      await p
        .getByRole("button", { name: "Minha garagem", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Abrir spot Audi RS6", exact: true }),
      ).toBeVisible();
    },
  );

  await verificar(
    "paginação de spots, seguidores, tentar novamente e links inválidos",
    async (p) => {
      await entrar(p);
      await p.evaluate(() => {
        const dados = JSON.parse(localStorage.getItem("spotei:demo"));
        for (let indice = 0; indice < 25; indice++) {
          dados.perfis.push({
            ...dados.perfis[0],
            id: `carga-${indice}`,
            usuario: `carga.${indice}`,
            nome: `Pessoa ${indice}`,
            pontos: 0,
          });
          dados.seguindo.push({ seguidor: `carga-${indice}`, seguido: "demo" });
          dados.publicacoes.push({
            ...dados.publicacoes[0],
            id: `carga-spot-${indice}`,
            carro: {
              ...dados.publicacoes[0].carro,
              modelo: `Modelo ${indice}`,
            },
            criadoEm: new Date(
              Date.now() - (100 + indice) * 3600000,
            ).toISOString(),
          });
        }
        localStorage.setItem("spotei:demo", JSON.stringify(dados));
      });
      await p.goto(`${endereco}/explorar`, { waitUntil: "domcontentloaded" });
      await p.getByLabel("Buscar", { exact: true }).fill("Modelo 24");
      await p
        .getByRole("button", { name: "Carregar mais spots", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Carregar mais spots", exact: true })
        .click();
      await expect(
        p.getByRole("button", {
          name: "Abrir spot Porsche Modelo 24",
          exact: true,
        }),
      ).toBeVisible();
      await perfil(p);
      await p
        .getByRole("button", { name: "Ver seguidores do perfil", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Carregar mais perfis", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Ver perfil de carga.24", exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Fechar lista", exact: true })
        .click();
      await p.evaluate(() => {
        const dados = JSON.parse(localStorage.getItem("spotei:demo"));
        dados.seguindo.push({ seguidor: "ausente", seguido: "demo" });
        localStorage.setItem("spotei:demo", JSON.stringify(dados));
      });
      await perfil(p);
      await p
        .getByRole("button", { name: "Ver seguidores do perfil", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Carregar mais perfis", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Tentar novamente", exact: true }),
      ).toBeVisible();
      await p.evaluate(() => {
        const dados = JSON.parse(localStorage.getItem("spotei:demo"));
        dados.perfis.push({
          ...dados.perfis[0],
          id: "ausente",
          nome: "Perfil restaurado",
          usuario: "perfil.restaurado",
        });
        localStorage.setItem("spotei:demo", JSON.stringify(dados));
      });
      await p
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await expect(
        p.getByRole("button", {
          name: "Ver perfil de perfil.restaurado",
          exact: true,
        }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Fechar lista", exact: true })
        .click();
      for (const rota of [
        "/publicacao/inexistente",
        "/carro/inexistente",
        "/usuario/inexistente",
        "/moderacao",
      ]) {
        await p.goto(`${endereco}${rota}`, { waitUntil: "domcontentloaded" });
        await p
          .getByRole("button", { name: "Voltar ao início", exact: true })
          .click();
        await expect(p.getByText("Na mira da comunidade")).toBeVisible();
      }
    },
  );

  await verificar(
    "descartar rascunho e recuperar erro na identificação",
    async (p) => {
      await entrar(p);
      await fotoControlada(p);
      await p
        .getByRole("button", { name: "Descartar rascunho", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Fotografar", exact: true }),
      ).toBeVisible();
      await expect(
        p.getByRole("button", { name: "Salvar e publicar", exact: true }),
      ).toHaveCount(0);
      let chamadas = 0;
      await p.route("**/api/analisar", async (rota) => {
        chamadas++;
        if (chamadas === 1)
          await rota.fulfill({
            status: 503,
            json: { erro: "Serviço temporariamente indisponível." },
          });
        else await rota.fallback();
      });
      const [arquivo] = await Promise.all([
        p.waitForEvent("filechooser"),
        p.getByRole("button", { name: "Galeria", exact: true }).click(),
      ]);
      await arquivo.setFiles("assets/carros/porsche.jpg");
      await expect(
        p.getByText("Serviço temporariamente indisponível.", { exact: true }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: "Tentar análise novamente", exact: true })
        .click();
      await expect(
        p.getByRole("heading", { name: "Audi RS6", exact: true }),
      ).toBeVisible();
    },
  );
} finally {
  await navegador.close();
}
assert.equal(
  falhas.length,
  0,
  falhas.map((f) => `${f.nome}: ${f.erro.message.slice(0, 250)}`).join("\n"),
);
console.log("Auditoria de controles concluída sem erros JavaScript.");
