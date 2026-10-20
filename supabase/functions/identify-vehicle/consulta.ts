export async function consultarGemini(
  chave: string,
  modelo: string,
  reserva: string,
  corpo: string,
  consultar: typeof fetch = fetch,
) {
  const prazo = AbortSignal.timeout(50000);
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    // A reserva continua usando IA real e só entra se o principal falhar.
    const atual = tentativa > 0 && reserva ? reserva : modelo;
    let resposta: Response;
    try {
      resposta = await consultar(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(atual)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": chave,
          },
          signal: AbortSignal.any([prazo, AbortSignal.timeout(18000)]),
          body: corpo,
        },
      );
    } catch (erro) {
      if (prazo.aborted) throw prazo.reason;
      if (tentativa === 2) throw erro;
      console.warn("Gemini: nova tentativa após falha de conexão.", {
        modelo: atual,
        tentativa: tentativa + 1,
      });
      await new Promise((resolver) =>
        setTimeout(resolver, 1000 * 2 ** tentativa),
      );
      continue;
    }
    if (resposta.ok) return resposta;
    // Cota, chave e imagem inválida exigem uma ação específica, não novas chamadas.
    const temporaria = [408, 500, 502, 503, 504].includes(resposta.status);
    const trocarModelo =
      resposta.status === 404 &&
      atual === modelo &&
      reserva &&
      reserva !== modelo;
    console.warn("Gemini recusou a análise.", {
      modelo: atual,
      status: resposta.status,
      tentativa: tentativa + 1,
    });
    if ((!temporaria && !trocarModelo) || tentativa === 2) return resposta;
    const pedido = Number(resposta.headers.get("Retry-After")) * 1000;
    const espera = Math.min(
      8000,
      Math.max(1000 * 2 ** tentativa, Number.isFinite(pedido) ? pedido : 0),
    );
    await resposta.body?.cancel();
    await new Promise((resolver) => setTimeout(resolver, espera));
    if (prazo.aborted) throw prazo.reason;
  }
  throw new Error("Não foi possível consultar o Gemini.");
}
