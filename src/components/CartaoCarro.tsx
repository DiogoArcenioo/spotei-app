import { Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { FotoCarro } from "./FotoCarro";
import { Raridade } from "./Raridade";
import { estilos } from "@/utils/tema";
import type { Publicacao } from "@/types/spot";
export function CartaoCarro({
  publicacao,
  largura = "48%",
}: {
  publicacao: Publicacao;
  largura?: "48%" | "100%";
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Abrir spot ${publicacao.carro.marca} ${publicacao.carro.modelo}`}
      style={[estilos.coluna, { width: largura }]}
      onPress={() =>
        router.push({
          pathname: "/publicacao/[id]",
          params: { id: publicacao.id },
        })
      }
    >
      <FotoCarro
        foto={publicacao.foto}
        style={{ width: "100%", aspectRatio: 1, borderRadius: 10 }}
      />
      <Text
        numberOfLines={2}
        style={[estilos.texto, { fontSize: 14, fontWeight: "600" }]}
      >
        {publicacao.carro.marca} {publicacao.carro.modelo}
      </Text>
      <Raridade valor={publicacao.carro.raridade} />
      <Text style={estilos.secundario}>
        {publicacao.estado === "rejeitado"
          ? "Rejeitado · 0 pontos"
          : publicacao.estado === "pendente"
            ? "Em revisão · 0 pontos"
            : `${publicacao.carro.versao || "Versão não confirmada"} · +${publicacao.pontos} pts`}
      </Text>
    </TouchableOpacity>
  );
}
