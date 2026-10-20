import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const endereco = process.env.SPOTEI_TEST_URL ?? "http://localhost:8081";
const navegador = await chromium.launch();
const pagina = await navegador.newPage({
  viewport: { width: 390, height: 844 },
});
const erros = [];
pagina.on("pageerror", (erro) => erros.push(erro.message));

try {
  await pagina.goto(endereco, { waitUntil: "domcontentloaded" });
  await pagina
    .getByRole("button", { name: "Entrar no app", exact: true })
    .click();
  await pagina.getByRole("button", { name: "Novo spot", exact: true }).click();

  for (const [botao, largura, altura, formato] of [
    ["Galeria", 3200, 1200, "image/jpeg"],
    ["Fotografar", 2000, 3000, "image/jpeg"],
    ["Galeria", 3200, 1200, "image/png"],
    ["Galeria", 2000, 3000, "image/webp"],
  ]) {
    // Marcadores nos quatro cantos detectam perda de conteúdo por recorte.
    const original = await pagina.evaluate(
      ({ largura, altura, formato }) => {
        const tela = document.createElement("canvas");
        tela.width = largura;
        tela.height = altura;
        const contexto = tela.getContext("2d");
        contexto.fillStyle = "#777777";
        contexto.fillRect(0, 0, largura, altura);
        for (const [cor, x, y] of [
          ["#ff0000", 0, 0],
          ["#00ff00", largura - 200, 0],
          ["#0000ff", 0, altura - 200],
          ["#ffffff", largura - 200, altura - 200],
        ]) {
          contexto.fillStyle = cor;
          contexto.fillRect(x, y, 200, 200);
        }
        return tela.toDataURL(formato, 0.95).split(",")[1];
      },
      { largura, altura, formato },
    );

    const [seletor] = await Promise.all([
      pagina.waitForEvent("filechooser"),
      pagina.getByRole("button", { name: botao, exact: true }).click(),
    ]);
    let enviada;
    await pagina.route("**/api/analisar", async (rota) => {
      enviada = Buffer.from(rota.request().postDataJSON().imagem, "base64");
      // Confere a imagem enviada sem consumir a cota do Gemini.
      await rota.fulfill({ status: 422, json: { erro: "Imagem de teste." } });
    });
    const resposta = pagina.waitForResponse(
      (r) =>
        r.url().endsWith("/api/analisar") && r.request().method() === "POST",
    );
    await seletor.setFiles({
      name: `foto-inteira.${formato.split("/")[1]}`,
      mimeType: formato,
      buffer: Buffer.from(original, "base64"),
    });
    await resposta;
    const previa = pagina.locator('img[src^="data:image/jpeg"]').first();
    await expect(previa).toHaveCSS("object-fit", "contain");
    assert.ok(enviada?.length);
    assert.deepEqual(Array.from(enviada.subarray(0, 3)), [255, 216, 255]);
    const recebida = await pagina.evaluate(async (bytes) => {
      const imagem = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
      );
      const tela = document.createElement("canvas");
      tela.width = imagem.width;
      tela.height = imagem.height;
      const contexto = tela.getContext("2d");
      contexto.drawImage(imagem, 0, 0);
      const cantos = [
        [10, 10],
        [tela.width - 10, 10],
        [10, tela.height - 10],
        [tela.width - 10, tela.height - 10],
      ];
      return {
        largura: tela.width,
        altura: tela.height,
        cores: cantos.map(([x, y]) =>
          Array.from(contexto.getImageData(x, y, 1, 1).data).slice(0, 3),
        ),
      };
    }, Array.from(enviada));
    assert.equal(Math.max(recebida.largura, recebida.altura), 1440);
    assert.ok(
      Math.abs(recebida.largura / recebida.altura - largura / altura) < 0.002,
    );
    const esperadas = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
    ];
    recebida.cores.forEach((cor, i) =>
      cor.forEach((canal, j) =>
        assert.ok(Math.abs(canal - esperadas[i][j]) < 15),
      ),
    );
    console.log(
      `OK: ${botao} aceitou ${formato} e enviou a foto inteira (${recebida.largura}x${recebida.altura}), com os quatro cantos preservados.`,
    );
    await expect(
      pagina.getByText("Imagem de teste.", { exact: true }),
    ).toBeVisible();
    await pagina
      .getByRole("button", { name: "Descartar rascunho", exact: true })
      .click();
    await pagina.unroute("**/api/analisar");
  }
  assert.deepEqual(erros, []);
} finally {
  await navegador.close();
}
