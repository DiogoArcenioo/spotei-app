import { useEffect } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { consultas } from "@/utils/consulta";
import { useSessao } from "@/stores/useSessao";
import { useSincronizacao } from "@/stores/useSincronizacao";
import { cores } from "@/utils/tema";
export default function Layout() {
  const { perfil, hidratado } = useSessao();
  useEffect(() => {
    const pararRede = NetInfo.addEventListener((rede) => {
      const online =
        rede.isConnected !== false && rede.isInternetReachable !== false;
      useSincronizacao.getState().definirOnline(online);
      if (online && useSessao.getState().perfil)
        void useSincronizacao.getState().sincronizar();
    });
    const estado = AppState.addEventListener("change", (valor) => {
      focusManager.setFocused(valor === "active");
      if (valor === "active" && useSessao.getState().perfil)
        void useSincronizacao.getState().sincronizar();
    });
    return () => {
      pararRede();
      estado.remove();
    };
  }, []);
  useEffect(() => {
    if (perfil?.id) {
      void useSincronizacao.getState().atualizarPendencias();
      void useSincronizacao.getState().sincronizar();
    }
  }, [perfil?.id]);
  return (
    <QueryClientProvider client={consultas}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SafeAreaView edges={["top", "left", "right"]} style={estilos.fundo}>
          <View style={estilos.app}>
            {!hidratado ? (
              <View style={estilos.carregando}>
                <ActivityIndicator color={cores.destaque} />
              </View>
            ) : (
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: cores.fundo },
                  headerTintColor: cores.destaque,
                  contentStyle: { backgroundColor: cores.fundo },
                  headerTitleStyle: { color: cores.texto },
                  headerBackTitle: "Voltar",
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen
                  name="redefinir-senha"
                  options={{ title: "Recuperar senha" }}
                />
                <Stack.Protected guard={!perfil}>
                  <Stack.Screen
                    name="entrar"
                    options={{ headerShown: false }}
                  />
                </Stack.Protected>
                <Stack.Protected guard={!!perfil}>
                  <Stack.Screen
                    name="(abas)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="publicacao/[id]"
                    options={{ title: "O spot" }}
                  />
                  <Stack.Screen
                    name="usuario/[id]"
                    options={{ title: "Spotter" }}
                  />
                  <Stack.Screen
                    name="carro/[id]"
                    options={{ title: "O carro" }}
                  />
                  <Stack.Screen
                    name="editar-perfil"
                    options={{ title: "Editar perfil" }}
                  />
                  <Stack.Screen
                    name="garagem"
                    options={{ title: "Minha garagem" }}
                  />
                  <Stack.Screen
                    name="moderacao"
                    options={{ title: "Moderação" }}
                  />
                  <Stack.Screen
                    name="privacidade"
                    options={{ title: "Privacidade e conta" }}
                  />
                </Stack.Protected>
              </Stack>
            )}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: cores.fundo, alignItems: "center" },
  app: { flex: 1, width: "100%", maxWidth: 580 },
  carregando: { flex: 1, alignItems: "center", justifyContent: "center" },
});
