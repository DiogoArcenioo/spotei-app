import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";
import {
  CryptoDigestAlgorithm,
  digestStringAsync,
  randomUUID,
} from "expo-crypto";

export async function escolherFotografia(camera: boolean) {
  if (camera) {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted)
      throw new Error(
        "Permita o acesso à câmera nas configurações do aparelho ou escolha a galeria.",
      );
  }
  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    // A IA recebe o enquadramento inteiro, sem passar pelo editor de corte.
    allowsEditing: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    shouldDownloadFromNetwork: true,
    quality: 0.9,
    exif: false,
  };
  const resultado = camera
    ? await ImagePicker.launchCameraAsync(opcoes)
    : await ImagePicker.launchImageLibraryAsync(opcoes);
  if (resultado.canceled) return null;
  const imagem = resultado.assets[0];
  if (imagem.fileSize && imagem.fileSize > 20 * 1024 * 1024)
    throw new Error("Escolha uma imagem de até 20 MB.");
  return prepararFotografia(imagem.uri, imagem.width, imagem.height);
}
export async function prepararFotografia(
  uri: string,
  largura: number,
  altura: number,
) {
  const contexto = ImageManipulator.manipulate(uri);
  if (Math.max(largura, altura) > 1440)
    contexto.resize(largura >= altura ? { width: 1440 } : { height: 1440 });
  const renderizada = await contexto.renderAsync();
  // Recriar em JPEG reduz o arquivo e remove os metadados originais da fotografia.
  const resultado = await renderizada.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.78,
    base64: true,
  });
  const base64 = resultado.base64!;
  if (base64.length > 8 * 1024 * 1024)
    throw new Error(
      "A imagem ficou muito grande. Escolha uma resolução menor.",
    );
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, base64);
  if (Platform.OS === "web")
    return { uri: `data:image/jpeg;base64,${base64}`, hash };
  const pasta = new Directory(Paths.document, "spots");
  pasta.create({ idempotent: true, intermediates: true });
  const arquivo = new File(pasta, `${randomUUID()}.jpg`);
  new File(resultado.uri).copy(arquivo);
  return { uri: arquivo.uri, hash };
}
export async function obterBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") return (await fetch(uri)).arrayBuffer();
  const base64 = await obterBase64(uri);
  return Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0)).buffer;
}
export async function obterBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:image/")) return uri.split(",")[1];
  if (Platform.OS !== "web") return new File(uri).base64();
  const bytes = new Uint8Array(await obterBytes(uri));
  let texto = "";
  for (let indice = 0; indice < bytes.length; indice += 8192)
    texto += String.fromCharCode(...bytes.subarray(indice, indice + 8192));
  return btoa(texto);
}
