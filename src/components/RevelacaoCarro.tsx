import { useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Raridade } from "./Raridade";
import type { Raridade as TipoRaridade } from "@/types/spot";
import { cores } from "@/utils/tema";

export function RevelacaoCarro({
  nome,
  raridade,
  pontos,
  animar,
  aoConcluir,
  children,
}: {
  nome: string;
  raridade: TipoRaridade;
  pontos?: number;
  animar: boolean;
  aoConcluir: () => void;
  children: ReactNode;
}) {
  const { height: alturaTela } = useWindowDimensions();
  const [altura, definirAltura] = useState(130);
  const [movimento] = useState(() => new Animated.Value(animar ? 0 : 1));
  const deslocamento = Math.max(0, (alturaTela - 100 - altura) / 2);

  useEffect(() => {
    if (!animar) {
      movimento.setValue(1);
      return;
    }
    let ativa = true;
    // O mesmo título sai do centro e se encaixa no layout, sem duplicar o conteúdo.
    const animacao = Animated.sequence([
      Animated.delay(700),
      Animated.timing(movimento, {
        toValue: 1,
        duration: 700,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]);
    movimento.setValue(0);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduzir) => {
      if (!ativa) return;
      if (reduzir) {
        movimento.setValue(1);
        aoConcluir();
      } else
        animacao.start(({ finished }) => {
          if (finished && ativa) aoConcluir();
        });
    });
    return () => {
      ativa = false;
      animacao.stop();
    };
  }, [animar, movimento, aoConcluir]);

  return (
    <View>
      {animar && (
        <Animated.View
          pointerEvents="none"
          style={[
            visual.fundo,
            {
              opacity: movimento.interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [1, 0, 0],
              }),
            },
          ]}
        />
      )}
      <Animated.View
        testID="revelacao-carro"
        onLayout={(evento) => definirAltura(evento.nativeEvent.layout.height)}
        style={[
          visual.destaque,
          {
            transform: [
              {
                translateY: movimento.interpolate({
                  inputRange: [0, 1],
                  outputRange: [deslocamento, 0],
                }),
              },
              {
                scale: movimento.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.18, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Raridade valor={raridade} destaque />
        <Text
          accessibilityRole="header"
          style={[visual.nome, nome.length > 28 && visual.nomeLongo]}
        >
          {nome}
        </Text>
        {pontos !== undefined && (
          <Text style={visual.pontos}>{pontos} pts estimados</Text>
        )}
      </Animated.View>
      <Animated.View
        testID="dados-carro"
        pointerEvents={animar ? "none" : "auto"}
        accessibilityElementsHidden={animar}
        importantForAccessibility={animar ? "no-hide-descendants" : "auto"}
        style={[
          visual.informacoes,
          {
            opacity: movimento.interpolate({
              inputRange: [0, 0.65, 1],
              outputRange: [0, 0, 1],
            }),
            transform: [
              {
                translateY: movimento.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const visual = StyleSheet.create({
  fundo: {
    position: "absolute",
    top: -1200,
    bottom: -1600,
    left: -40,
    right: -40,
    backgroundColor: cores.fundo,
    zIndex: 1,
  },
  destaque: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    paddingBottom: 24,
    zIndex: 2,
  },
  nome: {
    color: cores.texto,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
    width: "100%",
  },
  pontos: { color: cores.secundario, fontSize: 12 },
  nomeLongo: { fontSize: 26, lineHeight: 32, letterSpacing: -0.7 },
  informacoes: { gap: 18 },
});
