import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { cores } from "@/utils/tema";
export function Filtros({
  opcoes,
  valor,
  selecionar,
}: {
  opcoes: { valor: string; titulo: string }[];
  valor: string;
  selecionar: (valor: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.lista}
    >
      {opcoes.map((opcao) => (
        <TouchableOpacity
          key={opcao.valor}
          accessibilityRole="button"
          accessibilityState={{ selected: valor === opcao.valor }}
          onPress={() => selecionar(opcao.valor)}
          style={[estilos.opcao, valor === opcao.valor && estilos.ativa]}
        >
          <Text
            style={[
              estilos.texto,
              valor === opcao.valor && { color: "#050505" },
            ]}
          >
            {opcao.titulo}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const estilos = StyleSheet.create({
  lista: { gap: 10 },
  opcao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  ativa: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  texto: { color: cores.secundario, fontSize: 13, fontWeight: "600" },
});
