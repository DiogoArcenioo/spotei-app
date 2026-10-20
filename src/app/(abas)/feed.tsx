import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Cabecalho } from "@/components/Cabecalho";
import { CartaoPublicacao } from "@/components/CartaoPublicacao";
import { Estado } from "@/components/Estado";
import { Filtros } from "@/components/Filtros";
import { usePublicacoes } from "@/hooks/usePublicacoes";
import { servicos } from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
import { estilos } from "@/utils/tema";
export default function Feed() {
  const [filtro, definirFiltro] = useState("global");
  const consulta = usePublicacoes();
  const id = useSessao((s) => s.perfil?.id);
  const seguindo = useQuery({
    queryKey: ["seguindo", id],
    queryFn: () => servicos.seguindo(),
  });
  const publicacoes = consulta.data?.pages.flat() ?? [];
  const lista =
    filtro === "global"
      ? publicacoes
      : publicacoes.filter(
          (p) =>
            p.autorId === id ||
            seguindo.data?.some(
              (s) => s.seguidor === id && s.seguido === p.autorId,
            ),
        );
  return (
    <View style={estilos.tela}>
      <Cabecalho />
      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshing={consulta.isRefetching}
        onRefresh={() => {
          void consulta.refetch();
          void seguindo.refetch();
        }}
        ListHeaderComponent={
          <View style={{ padding: 20, gap: 18 }}>
            <Filtros
              opcoes={[
                { valor: "seguindo", titulo: "Last Spot" },
                { valor: "global", titulo: "Global Spot" },
              ]}
              valor={filtro}
              selecionar={definirFiltro}
            />
            <Text style={estilos.subtitulo}>Na mira da comunidade</Text>
            <Estado
              erro={consulta.error}
              repetir={() => void consulta.refetch()}
            />
          </View>
        }
        renderItem={({ item }) => <CartaoPublicacao publicacao={item} />}
        ListEmptyComponent={
          <Estado
            carregando={consulta.isLoading}
            vazio={
              !consulta.isLoading
                ? "Nenhum spot por aqui. Publique o primeiro ou siga um spotter."
                : undefined
            }
          />
        }
        onEndReached={() => {
          if (consulta.hasNextPage && !consulta.isFetchingNextPage)
            void consulta.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          <Estado carregando={consulta.isFetchingNextPage} />
        }
      />
    </View>
  );
}
