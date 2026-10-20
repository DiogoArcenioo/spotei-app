import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FotoCarro } from "./FotoCarro";
import { cores } from "@/utils/tema";
import type { Enquadramento } from "@/types/spot";

export function FotoPublicacao({
  foto,
  enquadramento = "inteira",
  ajustar,
  desabilitado = false,
}: {
  foto: string;
  enquadramento?: Enquadramento;
  ajustar?: () => void;
  desabilitado?: boolean;
}) {
  const inteira = enquadramento === "inteira";
  return (
    <View testID="foto-publicacao" style={visual.quadro}>
      <FotoCarro
        foto={foto}
        contentFit={inteira ? "contain" : "cover"}
        contentPosition="center"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={visual.selo}>
        <Text style={visual.seloTexto}>SPOTTED.</Text>
      </View>
      {ajustar && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            inteira ? "Preencher quadro" : "Mostrar foto inteira"
          }
          accessibilityValue={{
            text: inteira ? "Foto inteira" : "Quadro preenchido",
          }}
          disabled={desabilitado}
          onPress={ajustar}
          hitSlop={8}
          style={visual.ajuste}
        >
          <Ionicons name="resize-outline" size={21} color={cores.texto} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const visual = StyleSheet.create({
  // A mesma proporção e o mesmo fundo na prévia, no feed e nos detalhes.
  quadro: {
    width: "100%",
    aspectRatio: 6 / 5,
    backgroundColor: cores.fundo,
    overflow: "hidden",
  },
  ajuste: {
    position: "absolute",
    bottom: 12,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#000000BB",
    alignItems: "center",
    justifyContent: "center",
  },
  selo: {
    position: "absolute",
    bottom: 12,
    left: 14,
    backgroundColor: "#000000AA",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  seloTexto: {
    color: cores.destaque,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "900",
  },
});
