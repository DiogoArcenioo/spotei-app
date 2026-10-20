import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { Publicacao } from "@/types/spot";
import { Avatar } from "./Avatar";
import { FotoPublicacao } from "./FotoPublicacao";
import { Raridade } from "./Raridade";
import { useSessao } from "@/stores/useSessao";
import { useAcao } from "@/hooks/usePublicacoes";
import { servicos } from "@/services/servicos";
import { cores, estilos as comum } from "@/utils/tema";
import { Estado } from "./Estado";
import { MenuSpot } from "./MenuSpot";
export function CartaoPublicacao({
  publicacao,
  detalhado = false,
  onComentar,
}: {
  publicacao: Publicacao;
  detalhado?: boolean;
  onComentar?: () => void;
}) {
  const [menuAberto, definirMenuAberto] = useState(false);
  const perfil = useSessao((s) => s.perfil);
  const curtir = useAcao((id: string) => servicos.curtir(id));
  const curtido = publicacao.curtidas.includes(perfil?.id ?? "");
  const abrir = () =>
    router.navigate({
      pathname: "/publicacao/[id]",
      params: { id: publicacao.id },
    });
  return (
    <View style={estilos.card}>
      <View style={estilos.autor}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Ver perfil de ${publicacao.autor.usuario}`}
          style={[comum.linha, { flex: 1 }]}
          onPress={() =>
            router.push({
              pathname: "/usuario/[id]",
              params: { id: publicacao.autorId },
            })
          }
        >
          <Avatar nome={publicacao.autor.nome} foto={publicacao.autor.avatar} />
          <View>
            <Text style={estilos.usuario}>{publicacao.autor.usuario}</Text>
            <Text style={comum.secundario}>
              {publicacao.cidade || "Nas ruas"} ·{" "}
              {new Date(publicacao.criadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => definirMenuAberto(true)}
          accessibilityRole="button"
          accessibilityLabel="Opções e detalhes do spot"
          hitSlop={10}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={cores.texto} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        disabled={detalhado}
        accessibilityRole={detalhado ? "image" : "button"}
        onPress={abrir}
        accessibilityLabel={`Abrir spot ${publicacao.carro.marca} ${publicacao.carro.modelo}`}
      >
        <FotoPublicacao
          foto={publicacao.foto}
          enquadramento={publicacao.enquadramento}
        />
      </TouchableOpacity>
      <View style={estilos.conteudo}>
        <View style={comum.entre}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.carro}>
              {publicacao.carro.marca} {publicacao.carro.modelo}
            </Text>
            <Text style={comum.secundario}>
              {publicacao.carro.versao || "Versão não confirmada"}
              {publicacao.carro.ano ? ` · ${publicacao.carro.ano}` : ""}
            </Text>
          </View>
          <Raridade valor={publicacao.carro.raridade} />
        </View>
        <View style={comum.entre}>
          <View style={comum.linha}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={curtir.isPending || publicacao.sincronizando}
              accessibilityLabel={curtido ? "Descurtir spot" : "Curtir spot"}
              hitSlop={8}
              onPress={() => curtir.mutate(publicacao.id)}
            >
              <Ionicons
                name={curtido ? "heart" : "heart-outline"}
                size={26}
                color={curtido ? cores.magenta : cores.texto}
              />
            </TouchableOpacity>
            <Text style={comum.secundario}>{publicacao.curtidas.length}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={
                onComentar ??
                (() =>
                  router.navigate({
                    pathname: "/publicacao/[id]",
                    params: { id: publicacao.id, acao: "comentar" },
                  }))
              }
              accessibilityLabel="Comentar spot"
              hitSlop={8}
            >
              <Ionicons
                name="chatbubble-outline"
                size={24}
                color={cores.texto}
              />
            </TouchableOpacity>
          </View>
          <Text style={estilos.pontos}>
            {publicacao.sincronizando
              ? "Na fila"
              : publicacao.estado === "rejeitado"
                ? "Rejeitado · 0 pts"
                : publicacao.estado === "pendente"
                  ? "Em revisão"
                  : `+${publicacao.pontos} pts`}
          </Text>
        </View>
        <Text numberOfLines={detalhado ? undefined : 2} style={comum.texto}>
          {publicacao.descricao}
        </Text>
        <Estado erro={curtir.error} />
      </View>
      <MenuSpot
        aberta={menuAberto}
        fechar={() => definirMenuAberto(false)}
        id={publicacao.id}
        autorId={publicacao.autorId}
        proprio={publicacao.autorId === perfil?.id}
        detalhado={detalhado}
      />
    </View>
  );
}
const estilos = StyleSheet.create({
  card: {
    backgroundColor: cores.fundo,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
    marginBottom: 22,
  },
  autor: { flexDirection: "row", alignItems: "center", padding: 15, gap: 10 },
  usuario: { color: cores.texto, fontSize: 13, fontWeight: "700" },
  conteudo: { padding: 16, gap: 14 },
  carro: {
    color: cores.texto,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  pontos: { color: cores.destaque, fontSize: 12, fontWeight: "700" },
});
