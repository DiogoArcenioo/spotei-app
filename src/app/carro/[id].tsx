import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePublicacao } from "@/hooks/usePublicacao";
import { usePublicacoes } from "@/hooks/usePublicacoes";
import { FotoCarro } from "@/components/FotoCarro";
import { Raridade } from "@/components/Raridade";
import { Estado } from "@/components/Estado";
import { CartaoCarro } from "@/components/CartaoCarro";
import { Botao } from "@/components/Botao";
import { chaveCarro } from "@/utils/pontuacao";
import { estilos } from "@/utils/tema";
export default function DetalheCarro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = usePublicacao(id);
  const feed = usePublicacoes();
  const carro = consulta.data?.carro;
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Estado
        carregando={consulta.isLoading}
        erro={consulta.error}
        repetir={() => void consulta.refetch()}
      />
      {consulta.isError && (
        <Botao
          titulo="Voltar ao início"
          onPress={() => router.replace("/feed")}
          secundario
        />
      )}
      {carro && consulta.data && (
        <>
          <FotoCarro
            foto={consulta.data.foto}
            style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 24 }}
          />
          <Text style={estilos.titulo}>
            {carro.marca} {carro.modelo}
          </Text>
          <Raridade valor={carro.raridade} />
          <View style={estilos.card}>
            {[
              ["Versão", carro.versao ?? "Não confirmada"],
              ["Geração", carro.geracao ?? "Não confirmada"],
              ["Ano estimado", carro.ano?.toString() ?? "Não confirmado"],
            ].map(([nome, valor]) => (
              <View key={nome} style={estilos.entre}>
                <Text style={estilos.secundario}>{nome}</Text>
                <Text style={estilos.texto}>{valor}</Text>
              </View>
            ))}
          </View>
          <Text style={estilos.subtitulo}>O que se destaca</Text>
          <Text style={estilos.texto}>
            {carro.caracteristicas.join(" · ") ||
              "Sem detalhes técnicos confirmados."}
          </Text>
          <Text style={estilos.secundario}>{carro.justificativa}</Text>
          <Text style={estilos.secundario}>
            A raridade do catálogo é uma estimativa editorial. Nenhum número de
            produção ou preço foi presumido.
          </Text>
          <Text style={estilos.subtitulo}>Encontrado pela comunidade</Text>
          <View style={estilos.grade}>
            {feed.data?.pages
              .flat()
              .filter((p) => chaveCarro(p.carro) === chaveCarro(carro))
              .map((p) => (
                <CartaoCarro key={p.id} publicacao={p} />
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
