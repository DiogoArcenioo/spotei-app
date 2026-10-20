import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { cores } from "@/utils/tema";
import { modoDemo, usaGeminiLocal } from "@/utils/configuracao";
import { useSincronizacao } from "@/stores/useSincronizacao";
export function Cabecalho({ titulo = "Início" }: { titulo?: string }) {
  const caminho = usePathname();
  const [retorno, definirRetorno] = useState("");
  const { online, pendencias, sincronizando, sincronizar, erro } =
    useSincronizacao();
  useEffect(() => {
    if (!retorno) return;
    const aviso = setTimeout(() => definirRetorno(""), 4000);
    return () => clearTimeout(aviso);
  }, [retorno]);
  async function atualizar() {
    if (!online) {
      definirRetorno("Sem conexão");
      return;
    }
    await sincronizar();
    definirRetorno(
      useSincronizacao.getState().erro
        ? "Falha ao atualizar"
        : "Dados atualizados",
    );
  }
  return (
    <View>
      <View style={estilos.cabecalho}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Novo spot"
          disabled={caminho === "/publicar"}
          accessibilityState={{ disabled: caminho === "/publicar" }}
          onPress={() => router.navigate("/publicar")}
          style={[estilos.acao, caminho === "/publicar" && { opacity: 0.4 }]}
        >
          <Ionicons
            name="add-circle-outline"
            size={32}
            color={cores.destaque}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Sincronizar publicações"
          onPress={() => void atualizar()}
          disabled={sincronizando}
          accessibilityState={{ disabled: sincronizando, busy: sincronizando }}
          style={estilos.status}
        >
          <Text style={estilos.titulo}>{titulo}</Text>
          <View style={estilos.situacao}>
            <Ionicons
              name={online ? "cloud-done-outline" : "cloud-offline-outline"}
              size={12}
              color={online ? cores.secundario : cores.erro}
            />
            <Text style={estilos.statusTexto}>
              {retorno ||
                (sincronizando
                  ? "Sincronizando"
                  : !online
                    ? "Offline"
                    : usaGeminiLocal
                      ? "IA Gemini · dados locais"
                      : modoDemo
                        ? "Demonstração"
                        : "Comunidade")}
              {pendencias ? ` · ${pendencias} na fila` : ""}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Explorar"
          disabled={caminho === "/explorar"}
          accessibilityState={{ disabled: caminho === "/explorar" }}
          onPress={() => router.navigate("/explorar")}
          style={[estilos.acao, caminho === "/explorar" && { opacity: 0.4 }]}
        >
          <Ionicons name="search-outline" size={28} color={cores.magenta} />
        </TouchableOpacity>
      </View>
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
    </View>
  );
}
const estilos = StyleSheet.create({
  cabecalho: {
    backgroundColor: cores.fundo,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },
  acao: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  status: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 44,
  },
  statusTexto: { color: cores.secundario, fontSize: 10, flexShrink: 1 },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: "700" },
  situacao: { flexDirection: "row", alignItems: "center", gap: 4 },
  erro: { color: cores.erro, fontSize: 11, padding: 8 },
});
