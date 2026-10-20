import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

// Teste em navegador isolado. Inicie o Expo com npm run web antes de executar.
await mkdir("qa", { recursive: true });
const navegador = await chromium.launch({ headless: true });
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const pagina = await contexto.newPage();
const erros = [];
pagina.on("pageerror", (erro) => erros.push(erro.message));
pagina.on("console", (mensagem) => {
  if (mensagem.type() === "error") erros.push(mensagem.text().slice(0, 200));
});
async function abrirDemonstracao() {
  const opcoes = pagina.getByRole("button", {
    name: "Opções da demonstração",
    exact: true,
  });
  if ((await opcoes.getAttribute("aria-expanded")) !== "true")
    await opcoes.click();
}
try {
  await pagina.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await expect(
    pagina.getByRole("button", { name: "Entrar na demonstração", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await pagina.screenshot({ path: "qa/01-entrada.png" });
  await pagina
    .getByRole("button", { name: "Entrar na demonstração", exact: true })
    .click();
  await expect(pagina.getByText("Na mira da comunidade")).toBeVisible();
  await expect(pagina.getByRole("tab")).toHaveCount(3);
  await expect(
    pagina.getByRole("button", { name: "Novo spot", exact: true }),
  ).toBeVisible();
  await expect(
    pagina.getByRole("button", { name: "Explorar", exact: true }),
  ).toBeVisible();
  await expect(
    pagina.getByText("Porsche Panamera", { exact: true }),
  ).toBeVisible();
  await expect(pagina.locator("img").first()).toHaveJSProperty(
    "naturalWidth",
    1000,
  );
  await pagina.screenshot({ path: "qa/02-feed.png" });
  await pagina.getByLabel("Descurtir spot").first().click();
  await expect(pagina.getByLabel("Curtir spot").first()).toBeVisible();
  await pagina.getByLabel("Curtir spot").first().click();
  console.log("OK: login demo, feed, fotos e curtidas");

  await pagina.getByRole("button", { name: "Novo spot", exact: true }).click();
  await expect(
    pagina.getByRole("button", { name: "Fotografar", exact: true }),
  ).toBeInViewport();
  await expect(
    pagina.getByRole("button", { name: "Galeria", exact: true }),
  ).toBeInViewport();
  await pagina.screenshot({ path: "qa/08-novo-spot.png" });
  await abrirDemonstracao();
  await pagina.getByText("Usar foto de teste →", { exact: true }).click();
  await expect(
    pagina.getByText("Resultado simulado", { exact: true }),
  ).toBeVisible();
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(
    pagina.getByText("Escreva uma legenda.", { exact: true }),
  ).toBeVisible();
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("BMW encontrado no teste completo do app.");
  await pagina.getByRole("switch").click();
  await pagina.screenshot({ path: "qa/03-publicar.png" });
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(pagina.getByText("120 pts", { exact: true })).toBeVisible();
  await expect(
    pagina.getByRole("button", { name: "Abrir spot BMW M5", exact: true }),
  ).toBeInViewport();
  await expect(pagina.getByText("Primeiro Spot", { exact: true })).toHaveCount(
    0,
  );
  await pagina.screenshot({ path: "qa/04-perfil.png" });
  await pagina
    .getByRole("button", { name: "Ver conquistas", exact: true })
    .click();
  await expect(
    pagina.getByText("Primeiro Spot", { exact: true }),
  ).toBeVisible();
  await pagina.getByRole("button", { name: "Ver spots", exact: true }).click();
  console.log("OK: scan automático, validação, publicação e 80 pontos");

  await pagina
    .getByRole("button", { name: "Minha garagem", exact: true })
    .click();
  await expect(
    pagina
      .getByText("BMW M5", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await pagina
    .getByText("BMW M5", { exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await pagina
    .getByLabel("Seu comentário", { exact: true })
    .fill("Comentário de teste.");
  await pagina.getByRole("button", { name: "Comentar", exact: true }).click();
  await expect(
    pagina.getByText("Comentário de teste.", { exact: true }),
  ).toBeVisible();
  await pagina.reload();
  await expect(
    pagina.getByText("Comentário de teste.", { exact: true }),
  ).toBeVisible();
  console.log("OK: garagem, comentários e persistência após recarregar");

  await pagina.goto("http://localhost:8081/feed");
  await pagina.getByRole("button", { name: "Explorar", exact: true }).click();
  await pagina.getByLabel("Buscar", { exact: true }).fill("Porsche");
  await expect(
    pagina
      .getByText("Porsche Panamera", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await pagina.screenshot({ path: "qa/05-explorar.png" });
  await pagina.getByRole("tab", { name: /Ranking/ }).click();
  await expect(pagina.getByText("Quem domina as ruas?")).toBeVisible();
  await pagina.screenshot({ path: "qa/06-ranking.png" });
  console.log("OK: busca, navegação e ranking");

  await pagina.getByRole("button", { name: "Novo spot", exact: true }).click();
  await abrirDemonstracao();
  await pagina.getByText("Usar foto de teste →", { exact: true }).click();
  await expect(
    pagina.getByText("Resultado simulado", { exact: true }),
  ).toBeVisible();
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("Tentativa repetida.");
  await pagina.getByRole("switch").click();
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(
    pagina.getByText("Esta foto já foi publicada. Escolha outro arquivo.", {
      exact: true,
    }),
  ).toBeVisible();
  console.log("OK: prevenção de foto duplicada");

  await pagina
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  await abrirDemonstracao();
  await pagina
    .getByRole("button", { name: "Porsche Panamera", exact: true })
    .click();
  const [seletor] = await Promise.all([
    pagina.waitForEvent("filechooser"),
    pagina.getByRole("button", { name: "Galeria", exact: true }).click(),
  ]);
  await seletor.setFiles("assets/carros/bmw.jpg");
  await expect(
    pagina.getByText("Resultado simulado", { exact: true }),
  ).toBeVisible();
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("Registro pendente de teste.");
  await pagina.getByRole("switch").click();
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(pagina).toHaveURL(/\/perfil$/);
  await expect(
    pagina
      .getByText("120 pts", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    pagina
      .getByText("Em revisão · 0 pontos", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  console.log(
    "OK: galeria, preparação real da imagem e publicação épica sem pontos antecipados",
  );

  await pagina.getByRole("tab", { name: /Perfil/ }).click();
  await pagina
    .getByRole("button", { name: "Opções do perfil", exact: true })
    .click();
  await pagina
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await pagina
    .getByRole("button", { name: "Moderação demonstrativa", exact: true })
    .click();
  await pagina.getByRole("tab", { name: /Perfil/ }).click();
  await pagina
    .getByRole("button", { name: "Opções do perfil", exact: true })
    .click();
  await pagina
    .getByRole("button", { name: "Abrir moderação", exact: true })
    .click();
  await expect(pagina.getByText("Uma comunidade justa.")).toBeVisible();
  await pagina.getByRole("button", { name: "Aprovar", exact: true }).click();
  await expect(
    pagina.getByText("Nenhum registro pendente.", { exact: true }),
  ).toBeVisible();
  console.log("OK: moderação aprova o registro e recalcula a coleção");
  await pagina.getByRole("button", { name: "Catálogo", exact: true }).click();
  await expect(
    pagina
      .getByRole("button", { name: "Salvar raridade", exact: true })
      .first(),
  ).toBeVisible();
  console.log("OK: logout, perfil administrativo e catálogo");
  assert.deepEqual(erros, [], "Nenhum erro JavaScript em tempo de execução");
  console.log("Todos os fluxos passaram. Capturas em qa/.");
} finally {
  await navegador.close();
}
