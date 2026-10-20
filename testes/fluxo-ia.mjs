import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

// Este teste faz chamadas reais ao Gemini usando a chave privada do servidor Expo.
const endereco = process.env.SPOTEI_TEST_URL ?? "http://localhost:8081";
const saude = await fetch(`${endereco}/api/analisar`).then((r) => r.json());
assert.equal(
  saude.analiseReal,
  true,
  "Habilite Gemini no .env e inicie o Expo.",
);
await mkdir("qa", { recursive: true });
const navegador = await chromium.launch({ headless: true });
const pagina = await navegador.newPage({
  viewport: { width: 390, height: 844 },
});
const erros = [];
pagina.on("pageerror", (erro) => erros.push(erro.message));

async function identificar(tituloBotao, arquivo) {
  const [seletor] = await Promise.all([
    pagina.waitForEvent("filechooser"),
    pagina.getByRole("button", { name: tituloBotao, exact: true }).click(),
  ]);
  const [resposta] = await Promise.all([
    pagina.waitForResponse(
      (r) =>
        r.url().endsWith("/api/analisar") && r.request().method() === "POST",
      { timeout: 70000 },
    ),
    seletor.setFiles(arquivo),
  ]);
  const resultado = await resposta.json();
  assert.equal(
    resposta.status(),
    200,
    resultado.erro ?? "A identificação deve funcionar",
  );
  assert.equal(resultado.simulada, false);
  assert.ok(resultado.marca && resultado.modelo);
  await expect(
    pagina.getByRole("heading", {
      name: `${resultado.marca} ${resultado.modelo}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    pagina.getByRole("button", { name: "Salvar e publicar", exact: true }),
  ).toBeVisible();
  console.log(
    `OK: ${tituloBotao} reconheceu ${resultado.marca} ${resultado.modelo} pelo Gemini.`,
  );
  return resultado;
}

try {
  await pagina.goto(endereco, { waitUntil: "networkidle" });
  await pagina
    .getByRole("button", { name: "Entrar no app", exact: true })
    .click();
  await expect(pagina.getByText("Na mira da comunidade")).toBeVisible();
  await pagina.getByRole("button", { name: "Novo spot", exact: true }).click();
  await expect(
    pagina.getByRole("button", { name: "Opções da demonstração" }),
  ).toHaveCount(0);
  const camera = await identificar("Fotografar", "assets/carros/bmw.jpg");
  assert.equal(camera.marca.toLowerCase(), "bmw");
  await pagina.screenshot({
    path: "qa/09-ia-camera.png",
    animations: "disabled",
  });
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("Foto analisada pela IA usando o botão Fotografar.");
  await pagina.getByRole("switch").click();
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(pagina).toHaveURL(/\/perfil$/);
  await expect(
    pagina.getByText("Em revisão · 0 pontos", { exact: true }),
  ).toBeVisible();

  await pagina.getByRole("button", { name: "Novo spot", exact: true }).click();
  const galeria = await identificar("Galeria", "assets/carros/porsche.jpg");
  assert.equal(galeria.marca.toLowerCase(), "porsche");
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(
    pagina.getByText("Escreva uma legenda.", { exact: true }),
  ).toBeVisible();
  await pagina
    .getByLabel("Legenda", { exact: true })
    .fill("Foto da galeria com identificação real.");
  await pagina
    .getByRole("button", { name: "Corrigir identificação", exact: true })
    .click();
  await expect(pagina.getByLabel("Marca", { exact: true })).toHaveValue(
    galeria.marca,
  );
  await pagina.screenshot({
    path: "qa/10-ia-galeria.png",
    animations: "disabled",
  });
  await pagina.reload();
  await expect(
    pagina.getByRole("heading", {
      name: `${galeria.marca} ${galeria.modelo}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(pagina.getByLabel("Legenda", { exact: true })).toHaveValue(
    "Foto da galeria com identificação real.",
  );
  await pagina.getByRole("switch").click();
  await pagina
    .getByRole("button", { name: "Salvar e publicar", exact: true })
    .click();
  await expect(pagina).toHaveURL(/\/perfil$/);
  await expect(
    pagina.getByText("Em revisão · 0 pontos", { exact: true }),
  ).toHaveCount(2);
  assert.deepEqual(erros, []);
  console.log(
    "OK: validação, correção, rascunho restaurado e publicação com IA real.",
  );
} finally {
  await navegador.close();
}
