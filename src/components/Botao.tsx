import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { cores } from "@/utils/tema";
export function Botao({
  titulo,
  onPress,
  carregando = false,
  secundario = false,
  desabilitado = false,
  icone,
  compacto = false,
}: {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  secundario?: boolean;
  desabilitado?: boolean;
  icone?: ComponentProps<typeof Ionicons>["name"];
  compacto?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: carregando || desabilitado }}
      onPress={onPress}
      disabled={carregando || desabilitado}
      activeOpacity={0.75}
      style={[
        estilos.botao,
        secundario && estilos.secundario,
        compacto && { minHeight: 42, paddingVertical: 9, paddingHorizontal: 10 },
        (carregando || desabilitado) && { opacity: 0.55 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={secundario ? cores.destaque : "#000"} />
      ) : (
        <>
          {icone && (
            <Ionicons
              name={icone}
              size={20}
              color={secundario ? cores.texto : cores.fundo}
            />
          )}
          <Text style={[estilos.texto, secundario && { color: cores.texto }]}>
            {titulo}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
const estilos = StyleSheet.create({
  botao: {
    backgroundColor: cores.destaque,
    borderRadius: 12,
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: cores.destaque,
  },
  secundario: { backgroundColor: cores.superficie, borderColor: cores.borda },
  texto: { color: cores.fundo, fontWeight: "700", fontSize: 14 },
});
