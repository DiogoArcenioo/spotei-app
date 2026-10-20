import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Cabecalho } from "@/components/Cabecalho";
import { Campo } from "@/components/Campo";
import { Filtros } from "@/components/Filtros";
import { Estado } from "@/components/Estado";
import { CartaoCarro } from "@/components/CartaoCarro";
import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { usePublicacoes } from "@/hooks/usePublicacoes";
import { servicos } from "@/services/servicos";
import { nomesRaridade, normalizar } from "@/utils/pontuacao";
import { estilos } from "@/utils/tema";
export default function Explorar() {
  const [busca, definirBusca] = useState("");
  const [raridade, definirRaridade] = useState("todas");
  const consulta = usePublicacoes();
  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: () => servicos.perfis(),
  });
  const publicacoes = (consulta.data?.pages.flat() ?? []).filter(
    (p) =>
      (raridade === "todas" || p.carro.raridade === raridade) &&
      normalizar(
        `${p.carro.marca} ${p.carro.modelo} ${p.carro.versao ?? ""} ${p.autor.usuario}`,
      ).includes(normalizar(busca)),
  );
  const usuarios = (perfis.data ?? []).filter((p) =>
    normalizar(`${p.nome} ${p.usuario}`).includes(normalizar(busca)),
  );
  return (
    <View style={estilos.tela}>
      <Cabecalho titulo="Explorar" />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={estilos.titulo}>Seu próximo achado.</Text>
          <Text style={estilos.secundario}>
            Carros, histórias e quem está atrás das lentes.
          </Text>
        </View>
        <Campo
          titulo="Buscar"
          placeholder="Marca, modelo ou spotter"
          value={busca}
          onChangeText={definirBusca}
        />
        <Filtros
          valor={raridade}
          selecionar={definirRaridade}
          opcoes={[
            { valor: "todas", titulo: "Todos" },
            ...Object.entries(nomesRaridade).map(([valor, titulo]) => ({
              valor,
              titulo,
            })),
          ]}
        />
        {!!busca.trim() && usuarios.length > 0 && (
          <>
            <Text style={estilos.subtitulo}>Spotters</Text>
            {usuarios.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={estilos.linha}
                onPress={() =>
                  router.push({
                    pathname: "/usuario/[id]",
                    params: { id: p.id },
                  })
                }
              >
                <Avatar nome={p.nome} foto={p.avatar} />
                <Text style={estilos.texto}>@{p.usuario}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
        <Text style={estilos.subtitulo}>
          {busca.trim() ? "Spots encontrados" : "Na rua agora"}
        </Text>
        <Estado
          carregando={consulta.isLoading}
          erro={consulta.error ?? perfis.error}
          repetir={() => {
            void consulta.refetch();
            void perfis.refetch();
          }}
        />
        <View style={estilos.grade}>
          {publicacoes.map((p) => (
            <CartaoCarro key={p.id} publicacao={p} />
          ))}
        </View>
        {!consulta.isLoading && !publicacoes.length && (
          <Estado vazio="Nenhum spot corresponde à sua busca." />
        )}
        {consulta.hasNextPage && (
          <Botao
            titulo="Carregar mais spots"
            onPress={() => void consulta.fetchNextPage()}
            carregando={consulta.isFetchingNextPage}
            secundario
          />
        )}
      </ScrollView>
    </View>
  );
}
