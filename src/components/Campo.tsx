import type { Ref } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { cores } from "@/utils/tema";
export function Campo({
  titulo,
  erro,
  referencia,
  ...props
}: TextInputProps & {
  titulo: string;
  erro?: string;
  referencia?: Ref<TextInput>;
}) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <TextInput
        ref={referencia}
        accessibilityLabel={titulo}
        placeholderTextColor="#777"
        {...props}
        style={[
          estilos.input,
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
          erro ? { borderColor: cores.erro } : null,
          props.style,
        ]}
      />
      {erro ? (
        <Text accessibilityLiveRegion="polite" style={estilos.erro}>
          {erro}
        </Text>
      ) : null}
    </View>
  );
}
const estilos = StyleSheet.create({
  campo: { gap: 7 },
  titulo: { color: cores.secundario, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: cores.superficie,
    color: cores.texto,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    minHeight: 48,
  },
  erro: { color: cores.erro, fontSize: 12 },
});
