import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FotoCarro } from "./FotoCarro";
import { Botao } from "./Botao";
import { cores } from "@/utils/tema";

export function ScanFotografia({
  foto,
  cancelar,
}: {
  foto: string;
  cancelar: () => void;
}) {
  const [movimento] = useState(() => new Animated.Value(0));
  const [altura, definirAltura] = useState(0);

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(movimento, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(movimento, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [movimento]);

  return (
    <Modal animationType="fade" onRequestClose={cancelar} statusBarTranslucent>
      <SafeAreaView style={visual.tela}>
        <ScrollView contentContainerStyle={visual.conteudo}>
          <View style={visual.cabecalho}>
            <Ionicons name="scan-outline" size={30} color={cores.destaque} />
            <Text style={visual.titulo} accessibilityRole="header">
              Analisando seu spot
            </Text>
            <Text style={visual.descricao}>
              Reconhecendo o carro na sua foto
            </Text>
          </View>
          <View
            style={visual.foto}
            onLayout={(evento) =>
              definirAltura(evento.nativeEvent.layout.height)
            }
          >
            <FotoCarro
              foto={foto}
              contentFit="contain"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[visual.canto, visual.superiorEsquerdo]} />
              <View style={[visual.canto, visual.superiorDireito]} />
              <View style={[visual.canto, visual.inferiorEsquerdo]} />
              <View style={[visual.canto, visual.inferiorDireito]} />
              <Animated.View
                testID="linha-scan"
                style={[
                  visual.linha,
                  {
                    transform: [
                      {
                        translateY: movimento.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, Math.max(12, altura - 14)],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={visual.brilho} />
              </Animated.View>
            </View>
          </View>
          <View
            style={visual.status}
            accessibilityLiveRegion="polite"
            accessibilityLabel="Análise da foto em andamento"
          >
            <ActivityIndicator color={cores.destaque} />
            <Text style={visual.descricao}>
              Identificando marca, modelo e detalhes…
            </Text>
          </View>
          <Text style={visual.aviso}>
            Depois da análise, você confere os dados e decide quando publicar.
          </Text>
          <Botao titulo="Cancelar análise" onPress={cancelar} secundario />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const visual = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 24,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  cabecalho: { alignItems: "center", gap: 10 },
  titulo: {
    color: cores.texto,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  descricao: {
    color: cores.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    flexShrink: 1,
  },
  foto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: cores.superficie,
  },
  canto: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: cores.destaque,
  },
  superiorEsquerdo: {
    top: 10,
    left: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  superiorDireito: {
    top: 10,
    right: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  inferiorEsquerdo: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  inferiorDireito: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  linha: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: cores.destaque,
  },
  brilho: {
    height: 18,
    marginTop: -8,
    backgroundColor: "#18E7FF24",
    borderTopWidth: 1,
    borderTopColor: "#FF35DD66",
  },
  status: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  aviso: {
    color: cores.secundario,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
