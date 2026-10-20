import { ActivityIndicator, Text, View } from "react-native";
import { cores, estilos } from "@/utils/tema";
import { Botao } from "./Botao";
import { mensagemErro } from "@/utils/erro";
export function Estado({
  carregando,
  erro,
  vazio,
  repetir,
}: {
  carregando?: boolean;
  erro?: unknown;
  vazio?: string;
  repetir?: () => void;
}) {
  if (!carregando && !erro && !vazio) return null;
  return (
    <View style={estilos.vazio}>
      {carregando ? (
        <>
          <ActivityIndicator color={cores.destaque} />
          <Text style={estilos.secundario}>Carregando...</Text>
        </>
      ) : erro ? (
        <>
          <Text accessibilityLiveRegion="polite" style={estilos.erro}>
            {mensagemErro(erro)}
          </Text>
          {repetir && (
            <Botao titulo="Tentar novamente" onPress={repetir} secundario />
          )}
        </>
      ) : (
        <Text style={estilos.secundario}>{vazio}</Text>
      )}
    </View>
  );
}
