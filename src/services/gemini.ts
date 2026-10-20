import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { obterBase64 } from "./fotografia";
import type { Identificacao } from "@/types/spot";

function enderecoServidor() {
  const configurado = process.env.EXPO_PUBLIC_IA_URL;
  if (configurado) return configurado.replace(/\/$/, "");
  if (Platform.OS === "web") return window.location.origin;
  // O endereço do Expo já aponta para o computador, inclusive ao abrir pelo celular.
  const endereco = Constants.expoConfig?.hostUri;
  if (endereco) return `http://${endereco}`;
  throw new Error(
    "Inicie o Expo no computador ou configure EXPO_PUBLIC_IA_URL.",
  );
}

export async function analisarComGemini(foto: string): Promise<Identificacao> {
  // Texto base64 evita diferenças no envio de buffers binários pelo Android/iOS.
  const imagem = await obterBase64(foto);
  const { data } = await axios.post<Identificacao>(
    `${enderecoServidor()}/api/analisar`,
    { imagem },
    {
      timeout: 65000,
    },
  );
  return data;
}
