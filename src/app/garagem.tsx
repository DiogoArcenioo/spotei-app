import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { usePublicacoesPerfil } from "@/hooks/usePublicacoes";
import { useSessao } from "@/stores/useSessao";
import { obterGaragem, nomesRaridade } from "@/utils/pontuacao";
import { Campo } from "@/components/Campo";
import { Filtros } from "@/components/Filtros";
import { CartaoCarro } from "@/components/CartaoCarro";
import { Estado } from "@/components/Estado";
import { estilos } from "@/utils/tema";
export default function Garagem() {
  const id = useSessao((s) => s.perfil?.id)!;
  const consulta = usePublicacoesPerfil(id);
  const [marca, definirMarca] = useState("");
  const [raridade, definirRaridade] = useState("todas");
  const [ordem, definirOrdem] = useState("recentes");
  const lista = obterGaragem(consulta.data ?? [], id)
    .filter(
      (p) =>
        p.carro.marca.toLowerCase().includes(marca.toLowerCase()) &&
        (raridade === "todas" || p.carro.raridade === raridade),
    )
    .sort((a, b) =>
      ordem === "pontos"
        ? b.pontos - a.pontos
        : b.criadoEm.localeCompare(a.criadoEm),
    );
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.titulo}>Encontros que ficam.</Text>
      <Text style={estilos.secundario}>
        O primeiro registro aprovado de cada modelo, geração e versão.
      </Text>
      <Campo
        titulo="Filtrar por marca"
        value={marca}
        onChangeText={definirMarca}
        placeholder="Todas as marcas"
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
      <Filtros
        valor={ordem}
        selecionar={definirOrdem}
        opcoes={[
          { valor: "recentes", titulo: "Mais recentes" },
          { valor: "pontos", titulo: "Mais pontos" },
        ]}
      />
      <Estado
        carregando={consulta.isLoading}
        erro={consulta.error}
        repetir={() => void consulta.refetch()}
      />
      <View style={estilos.grade}>
        {lista.map((p) => (
          <View key={p.id} style={{ width: "48%", gap: 6 }}>
            <CartaoCarro publicacao={p} largura="100%" />
            <Text style={estilos.secundario}>
              Primeiro registro:{" "}
              {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
            </Text>
          </View>
        ))}
      </View>
      {!consulta.isLoading && !lista.length && (
        <Estado vazio="Nenhum carro aprovado corresponde aos filtros." />
      )}
    </ScrollView>
  );
}
