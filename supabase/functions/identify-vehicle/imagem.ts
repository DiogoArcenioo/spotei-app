export const limiteImagem = 6 * 1024 * 1024;

// Confere o conteúdo real, pois extensão e Content-Type podem estar incorretos.
export function tipoImagem(bytes: Uint8Array): string | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return "image/png";
  const texto = (inicio: number, fim: number) =>
    String.fromCharCode(...bytes.subarray(inicio, fim));
  if (texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") return "image/webp";
  if (texto(4, 8) === "ftyp") {
    const marcas = [texto(8, 12)];
    const tamanho = Math.min(
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
        0,
      ),
      bytes.length,
      128,
    );
    for (let i = 16; i + 4 <= tamanho; i += 4) marcas.push(texto(i, i + 4));
    if (marcas.some((m) => ["avif", "avis"].includes(m))) return null;
    if (marcas.some((m) => ["heic", "heix", "hevc", "hevx"].includes(m)))
      return "image/heic";
    if (marcas.some((m) => ["mif1", "msf1"].includes(m))) return "image/heif";
  }
  return null;
}

export function decodificarImagem(base64: unknown): Uint8Array<ArrayBuffer> {
  if (typeof base64 !== "string") throw new Error("Escolha uma fotografia.");
  const conteudo = base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (conteudo.length > Math.ceil(limiteImagem / 3) * 4)
    throw new Error("Escolha uma foto de até 6 MB.");
  if (
    !conteudo ||
    conteudo.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(conteudo)
  )
    throw new Error("Arquivo inválido. Selecione a imagem original novamente.");
  const texto = atob(conteudo);
  return Uint8Array.from(texto, (letra) => letra.charCodeAt(0));
}
