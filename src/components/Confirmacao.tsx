import { Modal, Text, View } from "react-native";
import { Botao } from "./Botao";
import { estilos } from "@/utils/tema";
import { Estado } from "./Estado";
export function Confirmacao({
  aberta,
  titulo,
  texto,
  confirmar,
  cancelar,
  carregando,
  erro,
}: {
  aberta: boolean;
  titulo: string;
  texto: string;
  confirmar: () => void;
  cancelar: () => void;
  carregando?: boolean;
  erro?: unknown;
}) {
  if (!aberta) return null;
  return (
    <Modal
      visible={aberta}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!carregando) cancelar();
      }}
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
        <View style={[estilos.card, { width: "100%", maxWidth: 450 }]}>
          <Text style={estilos.subtitulo}>{titulo}</Text>
          <Text style={estilos.texto}>{texto}</Text>
          <Estado erro={erro} />
          <Botao
            titulo="Confirmar"
            onPress={confirmar}
            carregando={carregando}
          />
          <Botao
            titulo="Cancelar"
            onPress={cancelar}
            secundario
            desabilitado={carregando}
          />
        </View>
      </View>
    </Modal>
  );
}
