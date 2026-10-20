import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { cores } from "@/utils/tema";
export function Avatar({
  nome,
  foto,
  tamanho = 40,
}: {
  nome: string;
  foto?: string | null;
  tamanho?: number;
}) {
  const dimensoes = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
  };
  return foto ? (
    <Image source={foto} style={dimensoes} contentFit="cover" />
  ) : (
    <View style={[estilos.avatar, dimensoes]}>
      <Text
        style={{
          color: cores.destaque,
          fontWeight: "800",
          fontSize: tamanho * 0.32,
        }}
      >
        {nome
          .split(/[ .]/)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase()}
      </Text>
    </View>
  );
}
const estilos = StyleSheet.create({
  avatar: {
    backgroundColor: "#18E7FF12",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#18E7FF55",
  },
});
