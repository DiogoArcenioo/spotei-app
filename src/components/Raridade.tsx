import { StyleSheet, Text, View } from "react-native";
import type { Raridade as Tipo } from "@/types/spot";
import { nomesRaridade } from "@/utils/pontuacao";
const coresRaridade = {
  comum: "#ADADAD",
  incomum: "#80D89E",
  raro: "#75B6FF",
  epico: "#BD93FF",
  lendario: "#FF35DD",
};
export function Raridade({
  valor,
  destaque = false,
}: {
  valor: Tipo;
  destaque?: boolean;
}) {
  return (
    <View
      style={[
        estilos.selo,
        destaque && {
          alignSelf: "center",
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 24,
        },
        {
          borderColor: coresRaridade[valor] + "55",
          backgroundColor: coresRaridade[valor] + "12",
        },
      ]}
    >
      <Text
        style={[
          estilos.texto,
          { color: coresRaridade[valor] },
          destaque && { fontSize: 15 },
        ]}
      >
        ◆ {nomesRaridade[valor]}
      </Text>
    </View>
  );
}
const estilos = StyleSheet.create({
  selo: {
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  texto: { fontSize: 11, fontWeight: "700" },
});
