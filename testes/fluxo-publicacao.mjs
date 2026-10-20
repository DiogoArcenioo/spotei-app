import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const endereco = process.env.SPOTEI_TEST_URL ?? "http://localhost:8081";
const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: 390, height: 844 },
});
const erros = [];
pagina.on("pageerror", (erro) => erros.push(erro.message));
await mkdir("qa", { recursive: true });
const botao = (nome) => pagina.getByRole("button", { name: nome, exact: true });
const quantidade = () =>
  pagina.evaluate(
    () => JSON.parse(localStorage.getItem("spotei:demo")).publicacoes.length,
  );
async function escolher(nome, caminho) {
  const [seletor] = await Promise.all([
    pagina.waitForEvent("filechooser"),
    botao(nome).click(),
  ]);
  await seletor.setFiles(caminho);
}
function identificacao(requisicao, modelo = "TT") {
  const hash = createHash("sha256")
    .update(requisicao.postDataBuffer())
    .digest("hex");
  return {
    id: `teste-${hash}`,
    identificacaoId: `teste-${hash}`,
    marca: "Audi",
    modelo,
    versao: "2.0 TFSI",
    ano: 2016,
    geracao: "8S",
    raridade: "raro",
    caracteristicas: ["Cupê de duas portas"],
    justificativa: "Resposta controlada para testar o fluxo.",
    caminho: "",
    hash,
    confianca: "alta",
    revisao: true,
    simulada: false,
    verificado: false,
  };
}

try {
  await pagina.goto(endereco, { waitUntil: "domcontentloaded" });
  await botao("Entrar no app").click();
  await expect(pagina.getByText("Na mira da comunidade")).toBeVisible();
  const inicial = await quantidade();
  await botao("Novo spot").click();

  // O scan começa automaticamente e não cria uma publicação antes de salvar.
  let responder;
  let analisesIniciais = 0;
  await pagina.route("**/api/analisar", async (rota) => {
    analisesIniciais++;
    await new Promise((resolver) => {
      responder = resolver;
    });
    await rota.fulfill({ json: identificacao(rota.request()) });
  });
  await escolher("Galeria", "assets/carros/bmw.jpg");
  await expect(
    pagina.getByText("Analisando seu spot", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => Boolean(responder)).toBe(true);
  const linha = pagina.getByTestId("linha-scan");
  const inicio = await linha.evaluate(
    (elemento) => getComputedStyle(elemento).transform,
  );
  await expect
    .poll(() =>
      linha.evaluate((elemento) => getComputedStyle(elemento).transform),
    )
    .not.toBe(inicio);
  assert.equal(await quantidade(), inicial);
  await pagina.screenshot({ path: "qa/scan-publicacao.png" });
  responder();
  const revelacao = pagina.getByTestId("revelacao-carro");
  await expect(revelacao).toBeVisible();
  const posicaoInicial = await revelacao.boundingBox();
  await expect(pagina.getByTestId("dados-carro")).toHaveCSS("opacity", "0");
  await expect(botao("Salvar e publicar")).toHaveCount(0);
  await pagina.screenshot({ path: "qa/revelacao-raridade.png" });
  await expect(botao("Salvar e publicar")).toBeVisible();
  const posicaoFinal = await revelacao.boundingBox();
  assert.ok(
    posicaoInicial.y - posicaoFinal.y > 120,
    "O nome e a raridade saem do centro e se encaixam no topo.",
  );
  assert.ok(
    posicaoInicial.width > posicaoFinal.width,
    "A revelação diminui ao se encaixar.",
  );
  await expect(pagina.getByTestId("dados-carro")).toHaveCSS("opacity", "1");
  await expect(botao("Fotografar")).toHaveCount(0);
  await expect(botao("Galeria")).toHaveCount(0);
  await expect(pagina.getByRole("tab")).toHaveCount(0);
  await expect(
    pagina.getByRole("heading", { name: "Audi TT", exact: true }),
  ).toBeVisible();
  await expect(
    pagina.getByText("Carro identificado com Gemini", { exact: true }),
  ).toHaveCount(0);
  await expect(pagina.getByText("2016", { exact: true })).toBeVisible();
  const previa = pagina
    .getByTestId("dados-carro")
    .getByTestId("foto-publicacao");
  const imagemPrevia = previa.locator("img");
  await expect(imagemPrevia).toHaveCSS("object-fit", "contain");
  await expect(imagemPrevia).toHaveJSProperty("naturalWidth", 1000);
  const fotoOriginal = await imagemPrevia.getAttribute("src");
  await botao("Preencher quadro").click();
  await expect(imagemPrevia).toHaveCSS("object-fit", "cover");
  await pagina.screenshot({ path: "qa/previa-preencher.png" });
  await pagina.reload();
  await expect(botao("Mostrar foto inteira")).toBeVisible();
  await expect(imagemPrevia).toHaveCSS("object-fit", "cover");
  await botao("Mostrar foto inteira").click();
  await expect(imagemPrevia).toHaveCSS("object-fit", "contain");
  assert.equal(
    analisesIniciais,
    1,
    "Ajustar a publicação não muda a análise da foto inteira.",
  );
  const tamanhoPrevia = await previa.boundingBox();
  assert.ok(Math.abs(tamanhoPrevia.width / tamanhoPrevia.height - 1.2) < 0.01);
  await previa.screenshot({ path: "qa/previa-foto-inteira.png" });
  await pagina.screenshot({ path: "qa/dados-identificados.png" });
  assert.equal(await quantidade(), inicial);

  await botao("Corrigir identificação").click();
  await expect(pagina.getByLabel("Marca", { exact: true })).toHaveValue("Audi");
  await pagina.getByLabel("Modelo", { exact: true }).fill("TT Coupé");
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("Meu spot conferido antes de publicar.");
  await botao("Salvar e publicar").click();
  await expect(
    pagina.getByText("Confirme o direito de uso da foto.", { exact: true }),
  ).toBeVisible();
  assert.equal(await quantidade(), inicial);
  await pagina.getByRole("switch").click();
  await pagina.screenshot({ path: "qa/conferir-publicacao.png" });
  await botao("Salvar e publicar").click();
  await expect(pagina).toHaveURL(/\/perfil$/);
  await expect(botao("Abrir spot Audi TT Coupé")).toBeVisible();
  assert.equal(await quantidade(), inicial + 1);
  await pagina.screenshot({ path: "qa/perfil-publicado.png" });
  await pagina.getByRole("tab", { name: /Início/ }).click();
  await expect(
    pagina.getByText("Meu spot conferido antes de publicar.", { exact: false }),
  ).toBeVisible();
  await expect(
    pagina.getByText("Audi TT Coupé", { exact: true }),
  ).toBeVisible();
  await pagina.reload();
  await expect(
    pagina.getByText("Audi TT Coupé", { exact: true }),
  ).toBeVisible();
  await expect(
    pagina.locator('img[src^="data:image/jpeg"]').first(),
  ).toHaveJSProperty("naturalWidth", 1000);
  const fotoFeed = pagina
    .getByTestId("foto-publicacao")
    .filter({ visible: true })
    .first();
  await expect(fotoFeed.locator("img")).toHaveCSS("object-fit", "contain");
  assert.equal(await fotoFeed.locator("img").getAttribute("src"), fotoOriginal);
  const tamanhoFeed = await fotoFeed.boundingBox();
  assert.equal(tamanhoFeed.width, tamanhoPrevia.width);
  assert.equal(tamanhoFeed.height, tamanhoPrevia.height);
  await expect(botao("Preencher quadro")).toHaveCount(0);
  await fotoFeed.screenshot({ path: "qa/feed-foto-inteira.png" });
  const formatoSalvo = await pagina.evaluate(
    () =>
      JSON.parse(localStorage.getItem("spotei:demo")).publicacoes[0]
        .enquadramento,
  );
  assert.equal(formatoSalvo, "inteira");
  await pagina.screenshot({ path: "qa/feed-publicado.png" });
  await botao("Abrir spot Audi TT Coupé").click();
  const detalhe = pagina
    .getByRole("img", { name: "Abrir spot Audi TT Coupé", exact: true })
    .getByTestId("foto-publicacao");
  await expect(detalhe.locator("img")).toHaveCSS("object-fit", "contain");
  assert.equal(await detalhe.locator("img").getAttribute("src"), fotoOriginal);
  await pagina.goto(`${endereco}/feed`, { waitUntil: "domcontentloaded" });
  console.log(
    "OK: scan animado automático, conferência, correção, confirmação e publicação persistida no perfil e no feed.",
  );

  // Cancelar mantém a foto como rascunho e ignora a resposta atrasada.
  await pagina.unroute("**/api/analisar");
  await botao("Novo spot").click();
  await expect(botao("Fotografar")).toBeVisible();
  responder = undefined;
  let finalizada = false;
  await pagina.route("**/api/analisar", async (rota) => {
    await new Promise((resolver) => {
      responder = resolver;
    });
    await rota.fulfill({ json: identificacao(rota.request(), "R8") });
    finalizada = true;
  });
  await escolher("Fotografar", "assets/carros/porsche.jpg");
  await expect(
    pagina.getByText("Analisando seu spot", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => Boolean(responder)).toBe(true);
  await botao("Cancelar análise").click();
  responder();
  await expect.poll(() => finalizada).toBe(true);
  // Deixa terminar o tempo mínimo do scan para verificar a resposta cancelada.
  await pagina.waitForTimeout(1400);
  await expect(botao("Analisar foto")).toBeVisible();
  await expect(pagina.getByTestId("revelacao-carro")).toHaveCount(0);
  assert.equal(await quantidade(), inicial + 1);
  await pagina.reload();
  await expect(botao("Analisar foto")).toBeVisible();
  await expect(pagina.getByTestId("revelacao-carro")).toHaveCount(0);

  await pagina.unroute("**/api/analisar");
  let chamadas = 0;
  await pagina.route("**/api/analisar", async (rota) => {
    chamadas++;
    if (chamadas === 1)
      await rota.fulfill({
        status: 503,
        json: { erro: "Análise indisponível. Tente novamente." },
      });
    else await rota.fulfill({ json: identificacao(rota.request(), "R8") });
  });
  await botao("Analisar foto").click();
  await expect(
    pagina.getByText("Análise indisponível. Tente novamente.", { exact: true }),
  ).toBeVisible();
  await botao("Tentar análise novamente").click();
  await expect(
    pagina.getByRole("heading", { name: "Audi R8", exact: true }),
  ).toBeVisible();
  await botao("Descartar rascunho").click();
  await expect(botao("Fotografar")).toBeVisible();
  assert.equal(await quantidade(), inicial + 1);
  assert.deepEqual(erros, []);
  console.log(
    "OK: câmera, cancelamento, resposta atrasada, rascunho, falha, nova tentativa e descarte sem publicar.",
  );

  await pagina.unroute("**/api/analisar");
  await pagina.setViewportSize({ width: 320, height: 640 });
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  let analisesCompactas = 0;
  await pagina.route("**/api/analisar", async (rota) => {
    analisesCompactas++;
    await rota.fulfill({
      json: {
        ...identificacao(rota.request(), "Range Rover Sport SV Edition Two"),
        marca: "Land Rover",
        raridade: "lendario",
      },
    });
  });
  const retrato = await pagina.evaluate(() => {
    const tela = document.createElement("canvas");
    tela.width = 600;
    tela.height = 1000;
    const contexto = tela.getContext("2d");
    contexto.fillStyle = "#ff8800";
    contexto.fillRect(0, 0, tela.width, tela.height);
    return tela.toDataURL("image/png").split(",")[1];
  });
  await escolher("Galeria", {
    name: "retrato.png",
    mimeType: "image/png",
    buffer: Buffer.from(retrato, "base64"),
  });
  await expect(
    pagina.getByRole("heading", {
      name: "Land Rover Range Rover Sport SV Edition Two",
      exact: true,
    }),
  ).toBeVisible();
  await expect(botao("Salvar e publicar")).toBeVisible({ timeout: 400 });
  await expect(pagina.getByTestId("dados-carro")).toHaveCSS("opacity", "1");
  const limiteTitulo = await pagina
    .getByTestId("revelacao-carro")
    .boundingBox();
  assert.ok(limiteTitulo.x >= 0 && limiteTitulo.x + limiteTitulo.width <= 321);
  await expect(botao("Salvar e publicar")).toBeInViewport();
  async function corLateral() {
    const quadro = pagina
      .getByTestId("dados-carro")
      .getByTestId("foto-publicacao");
    const captura = await quadro.screenshot();
    return pagina.evaluate(async (bytes) => {
      const imagem = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );
      const tela = document.createElement("canvas");
      tela.width = imagem.width;
      tela.height = imagem.height;
      const contexto = tela.getContext("2d");
      contexto.drawImage(imagem, 0, 0);
      return Array.from(
        contexto.getImageData(5, Math.floor(tela.height / 2), 1, 1).data,
      ).slice(0, 3);
    }, Array.from(captura));
  }
  assert.deepEqual(
    await corLateral(),
    [5, 5, 16],
    "Foto vertical inteira ganha margens da cor do app.",
  );
  await pagina.screenshot({ path: "qa/revisao-compacta.png" });
  await pagina.reload();
  await expect(botao("Salvar e publicar")).toBeVisible();
  assert.equal(analisesCompactas, 1, "Retomar o rascunho não repete o scan.");
  await botao("Voltar ao início").click();
  await expect(pagina.getByText("Na mira da comunidade")).toBeVisible();
  await botao("Novo spot").click();
  await expect(botao("Salvar e publicar")).toBeVisible();
  await expect(botao("Fotografar")).toHaveCount(0);
  assert.equal(await quantidade(), inicial + 1);
  assert.deepEqual(erros, []);
  await botao("Preencher quadro").click();
  await expect(
    pagina
      .getByTestId("dados-carro")
      .getByTestId("foto-publicacao")
      .locator("img"),
  ).toHaveCSS("object-fit", "cover");
  const corPreenchida = await corLateral();
  assert.ok(
    corPreenchida[0] > 240 && corPreenchida[1] > 120,
    "Preencher remove as margens e ocupa o quadro.",
  );
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("Enquadramento preenchido.");
  await pagina.getByRole("switch").click();
  await botao("Salvar e publicar").click();
  await expect(pagina).toHaveURL(/\/perfil$/);
  await pagina.getByRole("tab", { name: /Início/ }).click();
  const quadros = pagina
    .getByTestId("foto-publicacao")
    .filter({ visible: true });
  await expect(quadros.nth(0).locator("img")).toHaveCSS("object-fit", "cover");
  await expect(quadros.nth(1).locator("img")).toHaveCSS(
    "object-fit",
    "contain",
  );
  assert.equal(await quantidade(), inicial + 2);
  console.log(
    "OK: tela pequena, nome longo, movimento reduzido e rascunho retomado sem repetir a revelação.",
  );
  console.log(
    "OK: prévia igual ao feed, ajustes independentes salvos por publicação e foto original preservada.",
  );
} catch (erro) {
  await pagina.screenshot({ path: "qa/fluxo-publicacao-falha.png" });
  console.log((await pagina.locator("body").innerText()).slice(-2200));
  throw erro;
} finally {
  await navegador.close();
}
