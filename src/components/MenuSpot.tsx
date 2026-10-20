import { Modal, Text, View } from "react-native";
import { router } from "expo-router";
import { Botao } from "./Botao";
import { estilos } from "@/utils/tema";

export function MenuSpot({
  aberta,
  fechar,
  id,
  autorId,
  proprio,
  detalhado,
}: {
  aberta: boolean;
  fechar: () => void;
  id: string;
  autorId: string;
  proprio: boolean;
  detalhado: boolean;
}) {
  function agir(acao?: string) {
    fechar();
    router.navigate({ pathname: "/publicacao/[id]", params: { id, acao } });
  }
  if (!aberta) return null;
  return (
    <Modal
      visible={aberta}
      transparent
      animationType="fade"
      onRequestClose={fechar}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#000C",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={[estilos.card, { width: "100%", maxWidth: 450 }]}
          accessibilityViewIsModal
        >
          <Text style={estilos.subtitulo}>Opções do spot</Text>
          {!detalhado && (
            <Botao titulo="Ver publicação" onPress={() => agir()} secundario />
          )}
          <Botao
            titulo="Ver perfil do autor"
            onPress={() => {
              fechar();
              router.push({
                pathname: "/usuario/[id]",
                params: { id: autorId },
              });
            }}
            secundario
          />
          {proprio ? (
            <Botao
              titulo="Excluir publicação"
              onPress={() => agir("excluir")}
              secundario
            />
          ) : (
            <Botao
              titulo="Denunciar publicação"
              onPress={() => agir("denunciar")}
              secundario
            />
          )}
          <Botao titulo="Fechar opções" onPress={fechar} />
        </View>
      </View>
    </Modal>
  );
}
