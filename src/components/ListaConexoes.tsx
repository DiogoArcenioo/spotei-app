import { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { servicos } from "@/services/servicos";
import { estilos } from "@/utils/tema";
import { Avatar } from "./Avatar";
import { Botao } from "./Botao";
import { Estado } from "./Estado";

export function ListaConexoes({
  aberta,
  titulo,
  ids,
  fechar,
}: {
  aberta: boolean;
  titulo: string;
  ids: string[];
  fechar: () => void;
}) {
  const [limite, definirLimite] = useState(20);
  const consultas = useQueryClient();
  const lista = useQuery({
    queryKey: ["conexoes", ids.join(","), limite],
    enabled: aberta,
    queryFn: () =>
      Promise.all(
        ids.slice(0, limite).map((id) =>
          consultas.fetchQuery({
            queryKey: ["perfil", id],
            queryFn: () => servicos.perfil(id),
          }),
        ),
      ),
  });
  if (!aberta) return null;
  return (
    <Modal
      visible={aberta}
      transparent
      animationType="fade"
      onRequestClose={fechar}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: "#000C",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={[
            estilos.card,
            { width: "100%", maxWidth: 450, maxHeight: "80%" },
          ]}
          accessibilityViewIsModal
        >
          <Text style={estilos.subtitulo}>{titulo}</Text>
          <ScrollView>
            <Estado
              carregando={lista.isLoading}
              erro={lista.error}
              repetir={() => void lista.refetch()}
            />
            {lista.data?.map((perfil) => (
              <TouchableOpacity
                key={perfil.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver perfil de ${perfil.usuario}`}
                style={[estilos.linha, { paddingVertical: 12 }]}
                onPress={() => {
                  fechar();
                  router.push({
                    pathname: "/usuario/[id]",
                    params: { id: perfil.id },
                  });
                }}
              >
                <Avatar nome={perfil.nome} foto={perfil.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.texto}>{perfil.nome}</Text>
                  <Text style={estilos.secundario}>@{perfil.usuario}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {lista.data && !lista.data.length && (
              <Estado vazio="Nenhum perfil por aqui ainda." />
            )}
            {ids.length > limite && (
              <Botao
                titulo="Carregar mais perfis"
                onPress={() => definirLimite(limite + 20)}
                carregando={lista.isFetching}
                secundario
              />
            )}
          </ScrollView>
          <Botao titulo="Fechar lista" onPress={fechar} secundario />
        </View>
      </View>
    </Modal>
  );
}
